import { isCancel } from '@clack/prompts';
import { defineCommand, showUsage } from 'citty';
import { mkdir } from 'node:fs/promises';
import { basename, relative } from 'node:path';

import type { Configuration, PresetName } from '../../shared/configuration.ts';
import type { FirstCommit } from '../../shared/git.ts';
import type { RegisteredPreset } from '../../shared/registry.ts';
import type { ProjectNames } from '../../shared/scaffold/name-token.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';
import type { CreationPlan } from './plan.ts';
import type { ShadcnPresetApplied } from './shadcn.ts';
import type { SkillsInstalled } from './skills.ts';

import { commitScaffold, initializeRepository } from '../../shared/git.ts';
import { partSays } from '../../shared/parts.ts';
import { governingPresets } from '../../shared/registry.ts';
import { recordedAmong, scaffoldRecordFile } from '../../shared/scaffold-manifest.ts';
import { installedFor, shippedContents } from '../../shared/scaffold/install.ts';
import { mcpServersFor, skillsFor } from '../../shared/scaffold/integrations.ts';
import {
  MANIFEST_FILE,
  manifestSourceFor,
  renderManifest,
} from '../../shared/scaffold/manifest.ts';
import { MCP_FILE, mcpFileOf } from '../../shared/scaffold/mcp.ts';
import { heroHint } from '../../shared/scaffold/name-token.ts';
import { KET_VERSION } from '../../shared/version.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { announce, openCreate } from './announce.ts';
import { configuredFromFlags } from './flags.ts';
import { PIPELINE_COMMANDS } from './pipeline-commands.generated.ts';
import { planCreation } from './plan.ts';
import { scaffoldFor } from './scaffold.ts';
import { withHarnessAndWorkflowRegistered, withHarnessRegistered } from './settings.ts';
import { applyShadcnPreset } from './shadcn-apply.ts';
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
  const registration = mcpFileOf(
    await readTextIfPresent(plan.root, MCP_FILE),
    mcpServersFor(targets, configuration.integrations),
  );

  // A preset ignores what its own toolchain downloads and builds, and ket adds
  // the state it keeps. The scaffold writes last, so it appends to the file
  // the preset ships rather than to whatever the directory started with.
  const ignored = shippedContents(installed, '.gitignore') ?? gitignore;

  const written = [
    manifestEntry(project.name, configuration),
    {
      path: '.claude/settings.json',
      contents: settingsFor(
        configuration,
        settings,
        installed.map((file) => file.path),
      ),
    },
    ...(registration === undefined ? [] : [registration]),
    ...installed,
    scaffoldRecordFile(recordedAmong(installed), KET_VERSION),
    ...scaffoldFor(configuration, ignored),
  ];

  await writeFiles(plan.root, written);

  // The person's design system lands before the commit so the first commit
  // already carries it, and a refusal is reported rather than thrown: the
  // stock scaffold is worth keeping when the registry is out of reach.
  const shadcn = await applyShadcnPreset(plan.root, configuration.shadcnPreset);

  // The skills land before the commit so the project is handed over whole,
  // and a refusal is reported rather than thrown: the scaffold is worth
  // keeping even when the tool cannot reach the sources it clones from.
  const skills = await installSkills(
    plan.root,
    shippedContents(installed, LOCKFILE),
    skillsFor(targets, configuration.integrations),
  );

  const first = await commitScaffold(plan.root);

  announceCreated(plan, governing, configuration, { first, skills, shadcn });
}

interface CreationOutcome {
  first: FirstCommit;
  skills: SkillsInstalled;
  shadcn: ShadcnPresetApplied;
}

function announceCreated(
  plan: CreationPlan,
  governing: RegisteredPreset,
  configuration: Configuration,
  outcome: CreationOutcome,
): void {
  announce(
    relative(process.cwd(), plan.root) || '.',
    governing.semantics.scripts,
    governing.semantics.gates,
    outcome.first,
    outcome.skills,
    outcome.shadcn,
    configuration.workflow ? PIPELINE_COMMANDS : [],
  );
}

function settingsFor(configuration: Configuration, settings: string, paths: string[]): string {
  return configuration.workflow
    ? withHarnessAndWorkflowRegistered(settings, paths)
    : withHarnessRegistered(settings, paths);
}

function manifestEntry(name: string, configuration: Configuration): ScaffoldFile {
  return {
    path: MANIFEST_FILE,
    contents: renderManifest(name, manifestSourceFor(configuration)),
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
    shadcn: {
      type: 'string',
      description: 'Your shadcn preset code from ui.shadcn.com/create',
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
      : configuredFromFlags(
          plan.key,
          args.with,
          args.preset,
          args.shadcn,
          args.language,
          args.workflow,
        );

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
