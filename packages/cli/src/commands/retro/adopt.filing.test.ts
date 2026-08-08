import type { GateSemantics } from '@ket/preset';

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { RetroAction } from './fold.ts';
import type { RetroWindow } from './window.ts';

import { fileAdoption } from './adopt.ts';
import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

const DUP: GateSemantics = {
  script: 'lint:dup',
  guards: 'It finds knowledge written twice.',
  commitJob: 'lint:dup',
  ciJob: 'check',
};

const BUSY = `${JSON.stringify({
  gate: 'transition',
  outcome: 'allowed',
  about: 'triaged',
  item: 'K-1',
  at: '2026-08-04T09:00:00.000Z',
})}\n`;

function turnedAway(item: string, at: string): string {
  return `${JSON.stringify({
    gate: 'write',
    outcome: 'refused',
    about: 'src/a.ts',
    item,
    at,
    reason: 'the test comes first',
  })}\n`;
}

function firstAction(log: string, gates: GateSemantics[]): RetroAction {
  const action = foldRetro(WORKING, log, WINDOW, gates).actions.at(0);

  if (action === undefined) {
    throw new Error('the week drafted nothing, so this scenario cannot run');
  }

  return action;
}

async function governed(log: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-adopt-filing-'));

  await mkdir(join(root, '.ket', 'items'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), "key: KET\ntargets:\n  '.': cli\n");
  await writeFile(join(root, '.ket', 'events.jsonl'), log);

  return root;
}

async function filedThrough(log: string, gates: GateSemantics[] = []): Promise<string> {
  const root = await governed(log);
  const key = await fileAdoption(root, firstAction(log, gates));

  return readFile(join(root, '.ket', 'items', key, 'item.yaml'), 'utf8');
}

describe('the item a cluster adoption files', () => {
  it('writes the whole item: sentence title, idea status, and the evidence chain', async () => {
    const log =
      turnedAway('K-1', '2026-08-04T09:00:00.000Z') + turnedAway('K-2', '2026-08-04T10:00:00.000Z');

    expect(await filedThrough(log)).toBe(
      [
        'title: `write` refused 2 times: the test comes first; run `ket gate write` where the work starts',
        'kind: chore',
        'size: story',
        'status: idea',
        'children: []',
        'description: |',
        '  Adopted from a retro draft.',
        '',
        '  gate: write',
        '  reason: the test comes first',
        '  moments: 2026-08-04T09:00:00.000Z, 2026-08-04T10:00:00.000Z',
        '  items: K-1, K-2',
        '',
      ].join('\n'),
    );
  });
});

describe('the item the dormant draft files', () => {
  it('writes an honest description: no moments, and only what the log can speak for', async () => {
    expect(await filedThrough(BUSY, [DUP])).toBe(
      [
        'title: the log has never recorded `lint:dup`; examine whether the rule still earns its place',
        'kind: chore',
        'size: story',
        'status: idea',
        'children: []',
        'description: |',
        '  Adopted from a retro draft.',
        '',
        '  gate: lint:dup',
        '  moments: none the log holds',
        '',
        '  The log sees a gate only when a session runs its script, so a run at commit time or in CI leaves no line here.',
        '',
      ].join('\n'),
    );
  });

  it('records the adoption on the gate alone, since the dormant draft has no reason', async () => {
    const root = await governed(BUSY);

    const key = await fileAdoption(root, firstAction(BUSY, [DUP]));

    const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8');
    const adoption = log.split('\n').find((line) => line.includes('"adopted"')) ?? '';

    expect(adoption).toContain('"adopted":"lint:dup"');
    expect(adoption).toContain(`"item":"${key}"`);
    expect(adoption).not.toContain('"reason"');
  });
});
