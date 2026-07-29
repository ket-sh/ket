import { defineCommand, showUsage } from 'citty';

import { COMMAND_ARGS } from '../../shared/args.ts';

const watch = defineCommand({
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

export async function usage(): Promise<void> {
  await showUsage(watch);
}

export default watch;
