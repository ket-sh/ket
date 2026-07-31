import { isCancel } from '@clack/prompts';
import { defineCommand, showUsage } from 'citty';
import { mkdir } from 'node:fs/promises';
import { basename, relative } from 'node:path';

import type { Configuration, PresetName } from '../../shared/configuration.ts';
import type { RegisteredPreset } from '../../shared/registry.ts';

import { commitScaffold, initializeRepository } from '../../shared/git.ts';
import { governingPresets } from '../../shared/registry.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { announce, openCreate } from './announce.ts';
import { filesToInstall, shippedContents } from './install.ts';
import { chosenFrom, filesFor, namesOffered } from './integrations.ts';
import { renderManifest } from './manifest.ts';
import { planCreation } from './plan.ts';
import { presetFrom } from './preset.ts';
import { scaffoldFor } from './scaffold.ts';
import { withHarnessRegistered } from './settings.ts';
import { installSkills } from './skills-install.ts';
import { askName, runWizard } from './wizard.ts';

const LOCKFILE = 'skills-lock.json';

function isInteractive(): boolean {
  return process.stdin.isTTY;
}

async function settleDirectory(given: string | undefined): Promise<string> {
  if (given !== undefined) {
    return given;
  }

  if (!isInteractive()) {
    throw new Error('ket create needs a directory, as in: ket create my-app');
  }

  const answered = await askName(process.cwd());

  if (isCancel(answered)) {
    throw new Error('nothing was created');
  }

  return answered;
}

function configuredFromFlags(
  key: string | undefined,
  named: string | undefined,
  asked: string | undefined,
): Configuration | undefined {
  const chosen = presetFrom(asked);

  if ('refused' in chosen) {
    throw new Error(chosen.refused);
  }

  const outcome = chosenFrom(named, namesOffered([chosen.preset]));

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  return key === undefined
    ? undefined
    : { key, targets: { '.': chosen.preset }, integrations: outcome.chosen };
}

async function settleConfiguration(
  key: string | undefined,
  named: string | undefined,
  asked: string | undefined,
): Promise<Configuration | undefined> {
  if (!isInteractive()) {
    return configuredFromFlags(key, named, asked);
  }

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

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a project under ket',
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
  },
  async run({ args }) {
    if (isInteractive()) {
      openCreate();
    }

    const plan = await planCreation(await settleDirectory(args.directory));
    const configuration = await settleConfiguration(plan.key, args.with, args.preset);

    if (configuration === undefined) {
      throw new Error(`nothing was configured for ${plan.root}`);
    }

    await mkdir(plan.root, { recursive: true });
    await initializeRepository(plan.root);

    const gitignore = await readTextIfPresent(plan.root, '.gitignore');
    const settings = await readTextIfPresent(plan.root, '.claude/settings.json');
    const targets = Object.values(configuration.targets);
    const governing = governingPreset(targets);
    const project = { name: basename(plan.root), key: configuration.key };

    const installed = [
      ...filesToInstall(targets, project),
      ...filesFor(targets, configuration.integrations),
    ];

    // A preset ignores what its own toolchain downloads and builds, and ket adds
    // the state it keeps. The scaffold writes last, so it appends to the file
    // the preset ships rather than to whatever the directory started with.
    const ignored = shippedContents(installed, '.gitignore') ?? gitignore;

    const written = [
      {
        path: 'package.json',
        contents: renderManifest(project.name, {
          dependencies: governing.item.dependencies,
          devDependencies: governing.item.devDependencies,
          scripts: governing.semantics.scripts,
        }),
      },
      { path: '.claude/settings.json', contents: withHarnessRegistered(settings) },
      ...installed,
      ...scaffoldFor(configuration, ignored),
    ];

    await writeFiles(plan.root, written);

    // The skills land before the commit so the project is handed over whole,
    // and a refusal is reported rather than thrown: the scaffold is worth
    // keeping even when the tool cannot reach the sources it clones from.
    const skills = await installSkills(plan.root, shippedContents(installed, LOCKFILE));

    const first = await commitScaffold(plan.root);

    announce(
      relative(process.cwd(), plan.root) || '.',
      governing.semantics.scripts,
      governing.semantics.gates,
      first,
      skills,
    );

    return plan;
  },
});

export async function usage(): Promise<void> {
  await showUsage(create);
}

export default create;
