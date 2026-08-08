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

function dormantAction(): RetroAction {
  const action = foldRetro(WORKING, BUSY, WINDOW, [DUP]).actions.at(0);

  if (action === undefined) {
    throw new Error('the quiet week drafted nothing, so this scenario cannot run');
  }

  return action;
}

async function governed(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-adopt-filing-'));

  await mkdir(join(root, '.ket', 'items'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), "key: KET\ntargets:\n  '.': cli\n");
  await writeFile(join(root, '.ket', 'events.jsonl'), BUSY);

  return root;
}

describe('filing the dormant draft as an item', () => {
  it('writes an honest description: no moments, and the scope the log can speak for', async () => {
    const root = await governed();

    const key = await fileAdoption(root, dormantAction());

    const filed = await readFile(join(root, '.ket', 'items', key, 'item.yaml'), 'utf8');

    expect(filed).toContain('  gate: lint:dup');
    expect(filed).toContain('  moments: none the log holds');
    expect(filed).toContain(
      '  The log sees a gate only when a session runs its script, ' +
        'so a run at commit time or in CI leaves no line here.',
    );
    expect(filed).not.toContain('  reason:');
    expect(filed).not.toContain('  items:');
  });

  it('records the adoption on the gate alone, since the dormant draft has no reason', async () => {
    const root = await governed();

    const key = await fileAdoption(root, dormantAction());

    const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8');
    const adoption = log.split('\n').find((line) => line.includes('"adopted"')) ?? '';

    expect(adoption).toContain('"adopted":"lint:dup"');
    expect(adoption).toContain(`"item":"${key}"`);
    expect(adoption).not.toContain('"reason"');
  });
});
