import { defineCommand, showUsage } from 'citty';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Filing } from '../../shared/decompose.ts';
import type { Item, ItemKind, ItemSize } from '../../shared/item.ts';
import type { Transition } from '../../shared/transition.ts';

import { renderBoard } from '../../shared/board.ts';
import { decompositionOf } from '../../shared/decompose.ts';
import { ITEM_KINDS, ITEM_SIZES, nextKey, renderItem, titleRefusal } from '../../shared/item.ts';
import { keyFrom, ketRootFrom } from '../../shared/locate.ts';
import { parseItem } from '../../shared/read-item.ts';
import { approvalOf, designOf, submissionOf } from '../../shared/transition.ts';

const KET_DIRECTORY = '.ket';

const BOARD_FILE = 'BOARD.md';

const ITEM_FILE = 'item.yaml';

function oneOf<Known extends string>(known: readonly Known[], given: string): Known {
  const found = known.find((candidate) => candidate === given);

  if (found === undefined) {
    throw new Error(`${given} is not one of ${known.join(', ')}`);
  }

  return found;
}

async function rootOrThrow(): Promise<string> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    throw new Error(`no ${KET_DIRECTORY} directory above ${process.cwd()}`);
  }

  return root;
}

async function keyOf(root: string): Promise<string> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, 'config.ts'));
  const key = keyFrom(loaded);

  if (key === undefined) {
    throw new Error(`${KET_DIRECTORY}/config.ts declares no project key`);
  }

  return key;
}

async function itemsIn(root: string): Promise<string[]> {
  const entries = await readdir(join(root, KET_DIRECTORY, 'items'), {
    withFileTypes: true,
  }).catch(() => []);

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

// The board is derived from the items, so it is rewritten wherever they are.
// Written once at create and never again, it went on saying the project had no
// items long after it had them, and a board that lies is worse than none.
async function refreshBoard(root: string): Promise<void> {
  const keys = await itemsIn(root);
  const stored = await Promise.all(
    keys.map(async (key) => ({
      key,
      contents: await readFile(join(root, KET_DIRECTORY, 'items', key, ITEM_FILE), 'utf8').catch(
        () => '',
      ),
    })),
  );

  await writeFile(
    join(root, KET_DIRECTORY, BOARD_FILE),
    renderBoard(await keyOf(root), stored),
    'utf8',
  );
}

async function write(root: string, key: string, item: Item): Promise<void> {
  const directory = join(root, KET_DIRECTORY, 'items', key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, ITEM_FILE), renderItem(item), 'utf8');
  await refreshBoard(root);
}

async function read(root: string, key: string): Promise<Item> {
  const path = join(root, KET_DIRECTORY, 'items', key, ITEM_FILE);
  const item = parseItem(await readFile(path, 'utf8').catch(() => ''));

  if (item === undefined) {
    throw new Error(`${key} has no item this repository can read`);
  }

  return item;
}

async function fileAlone(root: string, filing: Filing): Promise<void> {
  await write(root, filing.key, {
    title: filing.title,
    kind: filing.kind,
    size: filing.size,
    status: 'triaged',
    parent: undefined,
    children: [],
  });
}

async function fileUnder(root: string, filing: Filing, parentKey: string): Promise<void> {
  const outcome = decompositionOf({ key: parentKey, item: await read(root, parentKey) }, filing);

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await write(root, filing.key, outcome.child);
  await write(root, parentKey, outcome.parent);
}

const file = defineCommand({
  meta: { name: 'file', description: 'File a triaged item' },
  args: {
    title: { type: 'string', required: true, description: 'What the work is' },
    kind: { type: 'string', required: true, description: 'feature, bug, refactor or chore' },
    size: { type: 'string', required: true, description: 'epic, story, subtask or trivial' },
    parent: { type: 'string', description: 'The epic or story this breaks out of' },
  },
  async run({ args }) {
    const root = await rootOrThrow();
    const allocated = nextKey(await keyOf(root), await itemsIn(root));

    const kind: ItemKind = oneOf(ITEM_KINDS, args.kind);
    const size: ItemSize = oneOf(ITEM_SIZES, args.size);
    const refused = titleRefusal(args.title);

    if (refused !== undefined) {
      throw new Error(`${args.title.split('\n')[0] ?? ''} is not a title: ${refused}`);
    }

    const filing: Filing = { key: allocated, title: args.title, kind, size };

    if (args.parent === undefined) {
      await fileAlone(root, filing);
    } else {
      await fileUnder(root, filing, args.parent);
    }

    process.stdout.write(`${allocated}\n`);
  },
});

function stage(name: string, description: string, move: (item: Item) => Transition) {
  return defineCommand({
    meta: { name, description },
    args: {
      key: { type: 'positional', required: true, description: 'The item to move' },
    },
    async run({ args }) {
      const root = await rootOrThrow();
      const outcome = move(await read(root, args.key));

      if ('refused' in outcome) {
        throw new Error(`${args.key} is ${outcome.refused}`);
      }

      await write(root, args.key, outcome.moved);
      process.stdout.write(`${args.key} ${outcome.moved.status}\n`);
    },
  });
}

const design = stage('design', 'Open the design stage on a triaged item', designOf);

const submit = stage(
  'submit',
  'Hand a finished design to the person who approves it',
  submissionOf,
);

const approve = stage('approve', 'Move an approved item to implementing', approvalOf);

const item = defineCommand({
  meta: { name: 'item', description: 'Write the state a gate reads' },
  subCommands: { file, design, submit, approve },
});

export async function usage(): Promise<void> {
  await showUsage(item);
}

export default item;
