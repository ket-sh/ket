import { defineCommand, showUsage } from 'citty';
import { resolve } from 'node:path';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { read } from '../../shared/item-store.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { boardFeedFor } from './feed.ts';
import { openingOf } from './opening.ts';

const watch = defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch the pipeline as it runs',
  },
  args: {
    ...COMMAND_ARGS,
    key: {
      type: 'positional',
      required: false,
      description: 'An item to open straight onto its journey',
    },
    tab: {
      type: 'string',
      description: 'The journey tab to land on: overview, workflow, children, or artifacts',
    },
    screen: {
      type: 'string',
      description: 'The screen to land on: list or map',
    },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(resolve(args.cwd));
    const reading = openingOf({ key: args.key, tab: args.tab, screen: args.screen });

    if ('refused' in reading) {
      throw new Error(reading.refused);
    }

    if (reading.opening?.stage?.kind === 'journey') {
      await read(root, reading.opening.stage.key);
    }

    const { watch } = await import('@ket/tui');

    await watch(boardFeedFor(root));
  },
});

export async function usage(): Promise<void> {
  await showUsage(watch);
}

export default watch;
