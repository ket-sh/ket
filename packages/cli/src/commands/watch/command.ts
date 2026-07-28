import { defineCommand } from 'citty';

import { COMMAND_ARGS } from '../../shared/args.ts';

export default defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch the pipeline as it runs',
  },
  args: COMMAND_ARGS,
  async run() {
    const { watch } = await import('@ket/tui');

    await watch();
  },
});
