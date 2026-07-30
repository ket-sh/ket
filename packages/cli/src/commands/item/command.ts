import { defineCommand, showUsage } from 'citty';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Item, ItemKind, ItemSize } from '../../shared/item.ts';

import { ITEM_KINDS, ITEM_SIZES, nextKey, renderItem } from '../../shared/item.ts';
import { keyFrom, ketRootFrom } from '../../shared/locate.ts';
import { parseItem } from '../../shared/read-item.ts';
import { approvalOf } from '../../shared/transition.ts';

const KET_DIRECTORY = '.ket';

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

async function write(root: string, key: string, item: Item): Promise<void> {
  const directory = join(root, KET_DIRECTORY, 'items', key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, ITEM_FILE), renderItem(item), 'utf8');
}

const file = defineCommand({
  meta: { name: 'file', description: 'File a triaged item' },
  args: {
    title: { type: 'string', required: true, description: 'What the work is' },
    kind: { type: 'string', required: true, description: 'feature, bug, refactor or chore' },
    size: { type: 'string', required: true, description: 'epic, story, subtask or trivial' },
  },
  async run({ args }) {
    const root = await rootOrThrow();
    const key = await keyOf(root);
    const allocated = nextKey(key, await itemsIn(root));

    const kind: ItemKind = oneOf(ITEM_KINDS, args.kind);
    const size: ItemSize = oneOf(ITEM_SIZES, args.size);

    await write(root, allocated, {
      title: args.title,
      kind,
      size,
      status: 'triaged',
      children: [],
    });

    process.stdout.write(`${allocated}\n`);
  },
});

const approve = defineCommand({
  meta: { name: 'approve', description: 'Move an item to implementing' },
  args: {
    key: { type: 'positional', required: true, description: 'The item to approve' },
  },
  async run({ args }) {
    const root = await rootOrThrow();
    const path = join(root, KET_DIRECTORY, 'items', args.key, ITEM_FILE);
    const item = parseItem(await readFile(path, 'utf8').catch(() => ''));

    if (item === undefined) {
      throw new Error(`${args.key} has no item this repository can read`);
    }

    const outcome = approvalOf(item);

    if ('refused' in outcome) {
      throw new Error(`${args.key} is ${outcome.refused}`);
    }

    await write(root, args.key, outcome.approved);
    process.stdout.write(`${args.key} implementing\n`);
  },
});

const item = defineCommand({
  meta: { name: 'item', description: 'Write the state a gate reads' },
  subCommands: { file, approve },
});

export async function usage(): Promise<void> {
  await showUsage(item);
}

export default item;
