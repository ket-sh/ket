import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decisionOf, moveThrough } from './stage.ts';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-stage-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.ts'), "export default { key: 'K' };\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seeded(status: string): Promise<void> {
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    `title: The moved item\nkind: feature\nsize: story\nstatus: ${status}\n`,
  );
}

async function itemFile(): Promise<string> {
  return readFile(join(root, '.ket', 'items', 'K-1', 'item.yaml'), 'utf8');
}

async function log(): Promise<string> {
  return readFile(join(root, '.ket', 'events.jsonl'), 'utf8');
}

describe('moving an item through a gate', () => {
  it('writes the move and records the arrival when the gate allows it', async () => {
    await seeded('awaiting-approval');

    const outcome = await moveThrough(root, 'K-1', 'approve', decisionOf('approve'));

    expect(outcome).toStrictEqual({ moved: 'implementing' });
    await expect(itemFile()).resolves.toContain('status: implementing');

    const written = await log();

    expect(written).toContain('"outcome":"allowed"');
    expect(written).toContain('"about":"implementing"');
  });

  it('returns the refusal and records it without touching the item', async () => {
    await seeded('designing');

    const outcome = await moveThrough(root, 'K-1', 'ship', decisionOf('ship'));

    expect(outcome).toStrictEqual({ refused: 'still designing, so nothing has merged' });
    await expect(itemFile()).resolves.toContain('status: designing');

    const written = await log();

    expect(written).toContain('"outcome":"refused"');
    expect(written).toContain('still designing, so nothing has merged');
  });

  it('holds approval while another job is in hand', async () => {
    await seeded('awaiting-approval');
    await mkdir(join(root, '.ket', 'items', 'K-2'), { recursive: true });
    await writeFile(
      join(root, '.ket', 'items', 'K-2', 'item.yaml'),
      'title: The job in hand\nkind: feature\nsize: story\nstatus: implementing\n',
    );

    const outcome = await moveThrough(root, 'K-1', 'approve', decisionOf('approve'));

    expect(outcome).toStrictEqual({
      refused: 'waiting its turn: K-2 is the job in hand, and one job means one branch',
    });
    await expect(itemFile()).resolves.toContain('status: awaiting-approval');
  });

  it('answers with the gate refusal itself, never the queue, when both stand', async () => {
    await seeded('designing');
    await mkdir(join(root, '.ket', 'items', 'K-2'), { recursive: true });
    await writeFile(
      join(root, '.ket', 'items', 'K-2', 'item.yaml'),
      'title: The job in hand\nkind: feature\nsize: story\nstatus: implementing\n',
    );

    const outcome = await moveThrough(root, 'K-1', 'approve', decisionOf('approve'));

    expect(outcome).toStrictEqual({
      refused: 'still designing, so its artifacts are not written yet',
    });
  });
});
