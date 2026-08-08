import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

const SINCE = ['--since', '2026-08-03T00:00:00.000Z'];

const TEST_FIRST = 'the test comes first';

let where = '';
let lines: string[] = [];

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({
    gate,
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason,
  })}\n`;
}

const SEEDED =
  turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
  turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST) +
  turnedAway('review', '2026-08-04T11:00:00.000Z', 'the design names no spec');

async function governed(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-retro-adopt-'));

  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), "key: KET\ntargets:\n  '.': cli\n");
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n',
  );
  await writeFile(join(root, '.ket', 'events.jsonl'), SEEDED);

  return root;
}

async function adopt(number: string): Promise<unknown> {
  return runCommand('retro', ['adopt', number, '--cwd', where, ...SINCE]);
}

async function filedItem(key: string): Promise<string> {
  return readFile(join(where, '.ket', 'items', key, 'item.yaml'), 'utf8');
}

beforeEach(async () => {
  where = await governed();
  lines = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('filing a draft as an item through the normal pipeline', () => {
  it('files draft 1 as an idea and prints the key it took', async () => {
    await adopt('1');
    const filed = await filedItem('KET-1');

    expect(lines.join('')).toBe('KET-1\n');
    expect(filed).toContain('status: idea');
    expect(filed).toContain('kind: chore');
    expect(filed).toContain('size: story');
    expect(filed).toContain('  Adopted from a retro draft.');
  });

  it('titles the item with the draft sentence', async () => {
    await adopt('1');

    expect(await filedItem('KET-1')).toContain(
      `title: \`write\` refused 2 times: ${TEST_FIRST}; run \`ket gate write\` where the work starts`,
    );
  });

  it('writes the evidence chain into the description, so the item stands without the log', async () => {
    await adopt('1');
    const filed = await filedItem('KET-1');

    expect(filed).toContain('description: |');
    expect(filed).toContain('  gate: write');
    expect(filed).toContain(`  reason: ${TEST_FIRST}`);
    expect(filed).toContain('  moments: 2026-08-04T09:00:00.000Z, 2026-08-04T10:00:00.000Z');
    expect(filed).toContain('  items: K-1');
  });

  it('appends the adoption events without touching the lines already there', async () => {
    await adopt('1');
    const log = await readFile(join(where, '.ket', 'events.jsonl'), 'utf8');

    expect(log.startsWith(SEEDED)).toBe(true);
    expect(log).toContain('"gate":"transition","outcome":"allowed","about":"idea","item":"KET-1"');
    expect(log).toContain('"adopted":"write"');
    expect(log).toContain(`"reason":"${TEST_FIRST}"`);
  });
});

describe('adopting again and adopting the unknown', () => {
  it('refuses the second adoption by naming the item the first one filed', async () => {
    await adopt('1');

    await expect(adopt('1')).rejects.toThrow(/draft 1 already became KET-1/);
  });

  it('keeps the other drafts adoptable under their numbers, at the next keys', async () => {
    await adopt('1');
    await adopt('2');

    expect(await filedItem('KET-2')).toContain('title: `review` refused once');
  });

  it('refuses an unknown number by naming the range the report printed', async () => {
    await expect(adopt('9')).rejects.toThrow(
      /draft 9 is not one this retro drafted, and the drafts run 1 to 2/,
    );
  });

  it('refuses when the window drafted nothing to adopt', async () => {
    await writeFile(join(where, '.ket', 'events.jsonl'), '');

    await expect(adopt('1')).rejects.toThrow(/drafted nothing, so there is nothing to adopt/);
  });
});
