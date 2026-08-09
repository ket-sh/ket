import { defineCommand, showUsage } from 'citty';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { read } from '../../shared/item-store.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { partSays } from '../../shared/parts.ts';
import { boardFeedFor } from './feed.ts';
import { openedFrom, openingOf } from './opening.ts';
import { readView, rememberView } from './view-state.ts';

const watch = defineCommand({
  meta: {
    name: 'watch',
    description: partSays('watch'),
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
      description: 'The screen to land on: list, map, oplog, or docs',
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

    const home = join(tmpdir(), 'ket-watch');
    const opening = openedFrom(reading.opening, await readView(home, root));
    const { watch } = await import('@ket/tui');

    await watch(boardFeedFor(root), {
      opening,
      remember: (view) => {
        rememberView(home, root, view);
      },
    });
  },
});

export async function usage(): Promise<void> {
  await showUsage(watch);
}

export default watch;
