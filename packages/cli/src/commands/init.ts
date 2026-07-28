import { defineCommand } from 'citty';
import { resolve } from 'node:path';

import { COMMAND_ARGS } from '../command-args.ts';
import { planInitialization } from '../initialize.ts';
import { readTextIfPresent, writeFiles } from '../io/write-files.ts';
import { describePlan } from '../report.ts';
import { scaffoldFor } from '../scaffold.ts';

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

    if (plan.key === undefined) {
      throw new Error(
        `no project key could be derived from ${plan.root}, and init cannot yet ask for one`,
      );
    }

    const gitignore = await readTextIfPresent(plan.root, '.gitignore');

    await writeFiles(plan.root, scaffoldFor({ key: plan.key }, gitignore));

    for (const line of describePlan(plan)) {
      console.log(line);
    }

    return plan;
  },
});
