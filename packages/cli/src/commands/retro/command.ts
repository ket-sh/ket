import { defineCommand, showUsage } from 'citty';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { readLog } from '../../shared/event-log.ts';
import { semanticsOf } from '../../shared/governing.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { foldRetro } from './fold.ts';
import { renderRetro } from './report.ts';
import { retroPathOf, windowFrom } from './window.ts';

const retro = defineCommand({
  meta: {
    name: 'retro',
    description: 'Fold the event log into the week it covers',
  },
  args: {
    ...COMMAND_ARGS,
    since: {
      type: 'string',
      description: 'Read from this moment instead of the week the report is written in',
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'Print the whole retro as JSON instead of writing the report',
    },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(resolve(args.cwd));
    const chosen = windowFrom(new Date().toISOString(), args.since);

    if ('refused' in chosen) {
      throw new Error(chosen.refused);
    }

    const semantics = await semanticsOf(root);
    const folded = foldRetro(
      await readStored(root),
      await readLog(root),
      chosen.window,
      semantics?.gates ?? [],
    );

    if (args.json) {
      process.stdout.write(`${JSON.stringify(folded, undefined, 2)}\n`);

      return;
    }

    const path = retroPathOf(chosen.window);

    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), renderRetro(folded), 'utf8');
    process.stdout.write(`${path}\n`);
  },
});

export async function usage(): Promise<void> {
  await showUsage(retro);
}

export default retro;
