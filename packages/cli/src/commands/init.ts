import { defineCommand } from 'citty';
import { resolve } from 'node:path';

import { planInitialization } from '../initialize.ts';

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Configure this repository for ket',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Directory to configure',
      default: '.',
    },
  },
  async run({ args }) {
    const plan = await planInitialization(args.cwd);

    if (plan === undefined) {
      throw new Error(
        `no git repository above ${resolve(args.cwd)}. ket keeps its state at the repository root, so run this inside a repository`,
      );
    }

    return plan;
  },
});
