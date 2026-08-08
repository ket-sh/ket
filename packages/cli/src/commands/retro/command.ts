import type { ArgsDef } from 'citty';

import { defineCommand, showUsage } from 'citty';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { Retro } from './fold.ts';
import type { RetroWindow } from './window.ts';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { readLog } from '../../shared/event-log.ts';
import { semanticsOf } from '../../shared/governing.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { adoptNumbered } from './adopt.ts';
import { foldRetro } from './fold.ts';
import { renderRetro } from './report.ts';
import { isTerminal, runTour } from './tour.ts';
import { retroPathOf, windowFrom } from './window.ts';

const RETRO_ARGS = {
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
} as const satisfies ArgsDef;

interface FoldedWeek {
  root: string;
  window: RetroWindow;
  folded: Retro;
}

async function foldedWeekAt(cwd: string, since: string | undefined): Promise<FoldedWeek> {
  const root = await ketRootOrThrow(resolve(cwd));
  const chosen = windowFrom(new Date().toISOString(), since);

  if ('refused' in chosen) {
    throw new Error(chosen.refused);
  }

  const semantics = await semanticsOf(root);
  const log = await readLog(root);
  const folded = foldRetro(await readStored(root), log, chosen.window, semantics?.gates ?? []);

  return { root, window: chosen.window, folded };
}

const report = defineCommand({
  meta: {
    name: 'report',
    description: 'Fold the event log into the week it covers',
  },
  args: RETRO_ARGS,
  async run({ args }) {
    const week = await foldedWeekAt(args.cwd, args.since);

    if (args.json) {
      process.stdout.write(`${JSON.stringify(week.folded, undefined, 2)}\n`);

      return;
    }

    const path = retroPathOf(week.window);

    await mkdir(dirname(join(week.root, path)), { recursive: true });
    await writeFile(join(week.root, path), renderRetro(week.folded), 'utf8');
    process.stdout.write(`${path}\n`);

    if (isTerminal()) {
      await runTour(week.root, week.folded.actions);
    }
  },
});

const adopt = defineCommand({
  meta: {
    name: 'adopt',
    description: 'File a numbered retro draft as an item',
  },
  args: {
    number: {
      type: 'positional',
      required: true,
      description: 'The draft number the report printed',
    },
    ...COMMAND_ARGS,
    since: RETRO_ARGS.since,
  },
  async run({ args }) {
    const week = await foldedWeekAt(args.cwd, args.since);
    const adopted = await adoptNumbered(week.root, week.folded.actions, args.number);

    if ('refused' in adopted) {
      throw new Error(adopted.refused);
    }

    process.stdout.write(`${adopted.filed}\n`);
  },
});

const retro = defineCommand({
  meta: {
    name: 'retro',
    description: 'Fold the event log into the week it covers',
  },
  args: RETRO_ARGS,
  subCommands: { adopt, report },
  default: 'report',
});

export async function usage(): Promise<void> {
  await showUsage(retro);
}

export default retro;
