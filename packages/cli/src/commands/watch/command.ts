import { defineCommand, showUsage } from 'citty';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { boardFeedFor } from './feed.ts';

const watch = defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch the pipeline as it runs',
  },
  args: COMMAND_ARGS,
  async run() {
    const root = await ketRootOrThrow(process.cwd());
    const { watch } = await import('@ket/tui');

    await watch(boardFeedFor(root));
  },
});

export async function usage(): Promise<void> {
  await showUsage(watch);
}

export default watch;
