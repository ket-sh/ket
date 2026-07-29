import { defineCommand, showUsage } from 'citty';
import { mkdir } from 'node:fs/promises';

import type { Configuration } from '../../shared/configuration.ts';

import { initializeRepository } from '../../shared/git.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { planCreation } from './plan.ts';
import { scaffoldFor } from './scaffold.ts';
import { runWizard } from './wizard.ts';

async function settleConfiguration(key: string | undefined): Promise<Configuration | undefined> {
  if (!process.stdin.isTTY) {
    return key === undefined ? undefined : { key, targets: { '.': 'cli' } };
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
      required: true,
    },
  },
  async run({ args }) {
    const plan = await planCreation(args.directory);
    const configuration = await settleConfiguration(plan.key);

    if (configuration === undefined) {
      throw new Error(`nothing was configured for ${plan.root}`);
    }

    await mkdir(plan.root, { recursive: true });
    await initializeRepository(plan.root);

    const gitignore = await readTextIfPresent(plan.root, '.gitignore');

    await writeFiles(plan.root, scaffoldFor(configuration, gitignore));

    console.log(`created  ${plan.root}`);
    console.log(`key      ${configuration.key}`);

    return plan;
  },
});

export async function usage(): Promise<void> {
  await showUsage(create);
}

export default create;
