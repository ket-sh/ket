import { isCancel } from '@clack/prompts';
import { CLI_PRESET, CLI_SEMANTICS } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { mkdir } from 'node:fs/promises';
import { basename, relative } from 'node:path';

import type { Configuration } from '../../shared/configuration.ts';

import { initializeRepository } from '../../shared/git.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { announce, openCreate } from './announce.ts';
import { filesToInstall, shippedContents } from './install.ts';
import { chosenFrom, filesFor, namesOffered } from './integrations.ts';
import { renderManifest } from './manifest.ts';
import { planCreation } from './plan.ts';
import { scaffoldFor } from './scaffold.ts';
import { withHarnessRegistered } from './settings.ts';
import { askName, runWizard } from './wizard.ts';

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

async function settleConfiguration(
  key: string | undefined,
  named: string | undefined,
): Promise<Configuration | undefined> {
  if (!isInteractive()) {
    const outcome = chosenFrom(named, namesOffered(['cli']));

    if ('refused' in outcome) {
      throw new Error(outcome.refused);
    }

    return key === undefined
      ? undefined
      : { key, targets: { '.': 'cli' }, integrations: outcome.chosen };
  }

  const outcome = await runWizard(key);

  return 'configured' in outcome ? outcome.configured : undefined;
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
  },
  async run({ args }) {
    if (isInteractive()) {
      openCreate();
    }

    const plan = await planCreation(await settleDirectory(args.directory));
    const configuration = await settleConfiguration(plan.key, args.with);

    if (configuration === undefined) {
      throw new Error(`nothing was configured for ${plan.root}`);
    }

    await mkdir(plan.root, { recursive: true });
    await initializeRepository(plan.root);

    const gitignore = await readTextIfPresent(plan.root, '.gitignore');
    const settings = await readTextIfPresent(plan.root, '.claude/settings.json');
    const presets = Object.values(configuration.targets);
    const name = basename(plan.root);

    const installed = [
      ...filesToInstall(presets, name),
      ...filesFor(presets, configuration.integrations),
    ];

    // A preset ignores what its own toolchain downloads and builds, and ket adds
    // the state it keeps. The scaffold writes last, so it appends to the file
    // the preset ships rather than to whatever the directory started with.
    const ignored = shippedContents(installed, '.gitignore') ?? gitignore;

    const written = [
      {
        path: 'package.json',
        contents: renderManifest(name, {
          dependencies: CLI_PRESET.dependencies,
          devDependencies: CLI_PRESET.devDependencies,
          scripts: CLI_SEMANTICS.scripts,
        }),
      },
      { path: '.claude/settings.json', contents: withHarnessRegistered(settings) },
      ...installed,
      ...scaffoldFor(configuration, ignored),
    ];

    await writeFiles(plan.root, written);

    announce(relative(process.cwd(), plan.root) || '.', CLI_SEMANTICS.scripts, CLI_SEMANTICS.gates);

    return plan;
  },
});

export async function usage(): Promise<void> {
  await showUsage(create);
}

export default create;
