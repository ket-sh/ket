import { defineCommand } from 'citty';
import { resolve } from 'node:path';

import { COMMAND_ARGS } from '../command-args.ts';
import { planInitialization } from '../initialize.ts';
import { describePlan } from '../report.ts';

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

    for (const line of describePlan(plan)) {
      console.log(line);
    }

    return plan;
  },
});
