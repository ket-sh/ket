import { isCancel } from '@clack/prompts';
import { defineCommand, showUsage } from 'citty';
import { mkdir } from 'node:fs/promises';
import { basename, relative } from 'node:path';

import type { Configuration, PresetName } from '../../shared/configuration.ts';
import type { RegisteredPreset } from '../../shared/registry.ts';
import type { ProjectNames } from '../../shared/scaffold/name-token.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';
import type { CreationPlan } from './plan.ts';

import { commitScaffold, initializeRepository } from '../../shared/git.ts';
import { partSays } from '../../shared/parts.ts';
import { governingPresets } from '../../shared/registry.ts';
import { recordedAmong, scaffoldRecordFile } from '../../shared/scaffold-manifest.ts';
import { installedFor, shippedContents } from '../../shared/scaffold/install.ts';
import {
  chosenFrom,
  installsFor,
  offeredIntegrations,
  skillsFor,
} from '../../shared/scaffold/integrations.ts';
import { dictionaryInstallsFor, refuseLanguage } from '../../shared/scaffold/language.ts';
import { heroHint } from '../../shared/scaffold/name-token.ts';
import { KET_VERSION } from '../../shared/version.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { announce, openCreate } from './announce.ts';
import { renderManifest } from './manifest.ts';
import { PIPELINE_COMMANDS } from './pipeline-commands.generated.ts';
import { planCreation } from './plan.ts';
import { presetFrom } from './preset.ts';
import { scaffoldFor } from './scaffold.ts';
import { withHarnessAndWorkflowRegistered, withHarnessRegistered } from './settings.ts';
import { installSkills } from './skills-install.ts';
import { runsWizard } from './wizard-choice.ts';
import { askName, runWizard } from './wizard.ts';

const LOCKFILE = 'skills-lock.json';

function isInteractive(): boolean {
  return process.stdin.isTTY;
}

async function promptedDirectory(given: string | undefined): Promise<string> {
  if (given !== undefined) {
    return given;
  }

  const answered = await askName(process.cwd());

  if (isCancel(answered)) {
    throw new Error('nothing was created');
  }

  return answered;
}

function requiredDirectory(given: string | undefined): string {
  if (given !== undefined) {
    return given;
  }

  throw new Error('ket create needs a directory, as in: ket create my-app');
}

function configuredFromFlags(
  key: string | undefined,
  named: string | undefined,
  asked: string | undefined,
  language: string,
  workflow: boolean,
): Configuration | undefined {
  const chosen = presetFrom(asked);

  if ('refused' in chosen) {
    throw new Error(chosen.refused);
  }

  const outcome = chosenFrom(named, offeredIntegrations([chosen.preset]));

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  const refused = refuseLanguage(language);

  if (refused !== undefined) {
    throw new Error(refused);
  }

  return key === undefined
    ? undefined
    : { key, targets: { '.': chosen.preset }, integrations: outcome.chosen, language, workflow };
}

async function wizardConfiguration(key: string | undefined): Promise<Configuration | undefined> {
  const outcome = await runWizard(key);

  return 'configured' in outcome ? outcome.configured : undefined;
}

// One target today, and a monorepo is the slice that brings more. Reading the
// first is what keeps the manifest and the announcement from drifting back to
// a preset the project never chose.
function governingPreset(targets: PresetName[]): RegisteredPreset {
  const [governing] = governingPresets(targets);

  if (governing === undefined) {
    throw new Error(`ket writes no preset for ${targets.join(', ')}`);
  }

  return governing;
}

async function writeScaffold(plan: CreationPlan, configuration: Configuration): Promise<void> {
  await mkdir(plan.root, { recursive: true });
  await initializeRepository(plan.root);

  const gitignore = await readTextIfPresent(plan.root, '.gitignore');
  const settings = await readTextIfPresent(plan.root, '.claude/settings.json');
  const targets = Object.values(configuration.targets);
  const governing = governingPreset(targets);
  const project: ProjectNames = {
    name: basename(plan.root),
    key: configuration.key,
    hint: heroHint(configuration),
  };

  const installed = installedFor(configuration, project);

  // A preset ignores what its own toolchain downloads and builds, and ket adds
  // the state it keeps. The scaffold writes last, so it appends to the file
  // the preset ships rather than to whatever the directory started with.
  const ignored = shippedContents(installed, '.gitignore') ?? gitignore;

  const written = [
    manifestEntry(project.name, governing, targets, configuration),
    {
      path: '.claude/settings.json',
      contents: settingsFor(
        configuration,
        settings,
        installed.map((file) => file.path),
      ),
    },
    ...installed,
    scaffoldRecordFile(recordedAmong(installed), KET_VERSION),
    ...scaffoldFor(configuration, ignored),
  ];

  await writeFiles(plan.root, written);

  // The skills land before the commit so the project is handed over whole,
  // and a refusal is reported rather than thrown: the scaffold is worth
  // keeping even when the tool cannot reach the sources it clones from.
  const skills = await installSkills(
    plan.root,
    shippedContents(installed, LOCKFILE),
    skillsFor(targets, configuration.integrations),
  );

  const first = await commitScaffold(plan.root);

  announce(
    relative(process.cwd(), plan.root) || '.',
    governing.semantics.scripts,
    governing.semantics.gates,
    first,
    skills,
    configuration.workflow ? PIPELINE_COMMANDS : [],
  );
}

function settingsFor(configuration: Configuration, settings: string, paths: string[]): string {
  return configuration.workflow
    ? withHarnessAndWorkflowRegistered(settings, paths)
    : withHarnessRegistered(settings, paths);
}

function manifestEntry(
  name: string,
  governing: RegisteredPreset,
  targets: PresetName[],
  configuration: Configuration,
): ScaffoldFile {
  return {
    path: 'package.json',
    contents: renderManifest(name, {
      dependencies: governing.item.dependencies,
      devDependencies: [
        ...governing.item.devDependencies,
        ...installsFor(targets, configuration.integrations),
        ...dictionaryInstallsFor(configuration.language),
      ],
      scripts: governing.semantics.scripts,
    }),
  };
}

const create = defineCommand({
  meta: {
    name: 'create',
    description: partSays('create'),
  },
  args: {
    directory: {
      type: 'positional',
      description: 'Where the project goes',
      required: false,
    },
    with: {
      type: 'string',
      description: 'Integrations to enable, separated by commas',
      required: false,
    },
    preset: {
      type: 'string',
      description: 'The kind of project to write',
      required: false,
    },
    workflow: {
      type: 'boolean',
      description: 'Drive the project through the ket pipeline',
      default: true,
    },
    language: {
      type: 'string',
      description: 'The language the documentation speaks, as a tag like en or tr',
      default: 'en',
    },
  },
  async run({ args }) {
    const wizard = runsWizard(isInteractive(), args.preset);

    if (wizard) {
      openCreate();
    }

    const directory = wizard
      ? await promptedDirectory(args.directory)
      : requiredDirectory(args.directory);
    const plan = await planCreation(directory);
    const configuration = wizard
      ? await wizardConfiguration(plan.key)
      : configuredFromFlags(plan.key, args.with, args.preset, args.language, args.workflow);

    if (configuration === undefined) {
      throw new Error(`nothing was configured for ${plan.root}`);
    }

    await writeScaffold(plan, configuration);

    return plan;
  },
});

export async function usage(): Promise<void> {
  await showUsage(create);
}

export default create;
