import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ketRootOrThrow } from '../../../shared/locate.ts';
import { readArtifact } from '../surface/artifacts.ts';
import { itemDirOrThrow } from '../surface/show.ts';
import { plainState, stamped } from './state.ts';

const SIBLINGS: readonly { source: string; plain: string }[] = [
  { source: 'spec.md', plain: 'spec.plain.md' },
  { source: 'solution-design.md', plain: 'solution-design.plain.md' },
  { source: 'adr.md', plain: 'adr.plain.md' },
];

interface Sibling {
  name: string;
  plain: string;
  source: string | undefined;
}

const KEY_ARG = {
  key: { type: 'positional', required: true, description: 'The item to read' },
} as const;

async function located(key: string): Promise<string> {
  return itemDirOrThrow(await ketRootOrThrow(process.cwd()), key);
}

async function siblingsOf(itemDir: string): Promise<Sibling[]> {
  const found: Sibling[] = [];

  for (const pair of SIBLINGS) {
    const plain = await readArtifact(itemDir, pair.plain);

    if (plain !== undefined) {
      found.push({ name: pair.plain, plain, source: await readArtifact(itemDir, pair.source) });
    }
  }

  return found;
}

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

export const drift = defineCommand({
  meta: { name: 'drift', description: 'Read whether each plain sibling still matches its source' },
  args: KEY_ARG,
  async run({ args }) {
    const itemDir = await located(args.key);
    let refused = false;

    for (const sibling of await siblingsOf(itemDir)) {
      const state =
        sibling.source === undefined ? 'orphaned' : plainState(sibling.source, sibling.plain);

      say(`${sibling.name} ${state}`);
      refused = refused || state !== 'fresh';
    }

    if (refused) {
      process.exitCode = 1;
    }
  },
});

export const stamp = defineCommand({
  meta: {
    name: 'stamp',
    description: 'Stamp each plain sibling with the fingerprint of its source',
  },
  args: KEY_ARG,
  async run({ args }) {
    const itemDir = await located(args.key);

    for (const sibling of await siblingsOf(itemDir)) {
      if (sibling.source === undefined) {
        say(`${sibling.name} orphaned`);
        process.exitCode = 1;
        continue;
      }

      await writeFile(join(itemDir, sibling.name), stamped(sibling.source, sibling.plain));
      say(`${sibling.name} stamped`);
    }
  },
});
