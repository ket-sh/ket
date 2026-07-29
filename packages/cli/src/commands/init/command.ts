import { defineCommand } from 'citty';
import { resolve } from 'node:path';

import type { Configuration } from '../../shared/configuration.ts';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { readTextIfPresent, writeFiles } from '../../shared/write-files.ts';
import { planInitialization } from './plan.ts';
import { describePlan } from './report.ts';
import { scaffoldFor } from './scaffold.ts';
import { runWizard } from './wizard.ts';

async function settleConfiguration(key: string | undefined): Promise<Configuration | undefined> {
  if (!process.stdin.isTTY) {
    return key === undefined ? undefined : { key, targets: {} };
  }

  const outcome = await runWizard(key);

  return 'configured' in outcome ? outcome.configured : undefined;
}

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Configure this repository for ket',
  },
  args: COMMAND_ARGS,
  async run({ args }) {
    const plan = await planInitialization(args.cwd);

    if (plan === undefined) {
      throw new Error(
        `no git repository above ${resolve(args.cwd)}. ket keeps its state at the repository root, so run this inside a repository`,
      );
    }

    if (plan.configured) {
      throw new Error(`${plan.root} is already configured for ket`);
    }

    const configuration = await settleConfiguration(plan.key);

    if (configuration === undefined) {
      throw new Error(`nothing was configured for ${plan.root}`);
    }

    const gitignore = await readTextIfPresent(plan.root, '.gitignore');

    await writeFiles(plan.root, scaffoldFor(configuration, gitignore));

    for (const line of describePlan(plan)) {
      console.log(line);
    }

    return plan;
  },
});
