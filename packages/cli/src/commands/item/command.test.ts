import { runCommand as runCitty } from 'citty';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../shared/item.ts';

import { parseItem } from '../../shared/read-item.ts';
import item from './command.ts';

async function runItem(argv: string[]): Promise<void> {
  await runCitty(item, { rawArgs: argv });
}

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-item-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'config.yaml'),
    'key: K\ntargets:\n  .: cli\nintegrations: []\nlanguage: en\nworkflow: true\n',
  );
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched item\nkind: feature\nsize: story\nstatus: triaged\n',
  );
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function recorded(): Promise<unknown[]> {
  const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8').catch(() => '');

  return log
    .split('\n')
    .filter((line) => line !== '')
    .map((line): unknown => JSON.parse(line));
}

describe('the item command', () => {
  it('carries the blast capture beside the stages and the plain siblings', () => {
    expect(Object.keys(item.subCommands ?? {})).toContain('blast');
  });
});

describe('the trail an item leaves in the event log', () => {
  it('records a move with the status it reached and when', async () => {
    await runItem(['design', 'K-1']);

    const trail = await recorded();

    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      gate: 'transition',
      outcome: 'allowed',
      about: 'designing',
      item: 'K-1',
    });

    const at: unknown =
      trail[0] !== null && typeof trail[0] === 'object' ? Reflect.get(trail[0], 'at') : undefined;

    expect(Number.isNaN(Date.parse(String(at)))).toBe(false);
  });

  it('records a refused move with the reason the stage gave', async () => {
    await runItem(['design', 'K-1']);

    await expect(runItem(['design', 'K-1'])).rejects.toThrow();

    const trail = await recorded();

    expect(trail).toHaveLength(2);
    expect(trail[1]).toMatchObject({ gate: 'transition', outcome: 'refused', item: 'K-1' });
    expect(Reflect.get(trail[1] ?? {}, 'reason')).toBeTruthy();
  });

  it('records a filing as the arrival at triaged', async () => {
    await runItem(['file', '--title', 'A second item', '--kind', 'bug', '--size', 'subtask']);

    const trail = await recorded();

    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      gate: 'transition',
      outcome: 'allowed',
      about: 'triaged',
      item: 'K-2',
    });
  });
});

describe('filing an item with the description somebody wrote for it', () => {
  async function filed(key: string): Promise<Item | undefined> {
    return parseItem(await readFile(join(root, '.ket', 'items', key, 'item.yaml'), 'utf8'));
  }

  it('lands the description beside the fields the gates read', async () => {
    await runItem([
      'file',
      '--title',
      'Locked accounts sign in without warning',
      '--kind',
      'bug',
      '--size',
      'subtask',
      '--description',
      'Expected\n\nThe form names the lockout.',
    ]);

    await expect(filed('K-2')).resolves.toMatchObject({
      title: 'Locked accounts sign in without warning',
      description: 'Expected\n\nThe form names the lockout.',
    });
  });

  it('rewrites the description of an item already filed, when asked to describe it', async () => {
    await runItem(['describe', 'K-1', '--description', 'Slice rationale\n\nK-2 cuts first.']);

    await expect(filed('K-1')).resolves.toMatchObject({
      title: 'The watched item',
      status: 'triaged',
      description: 'Slice rationale\n\nK-2 cuts first.',
    });
  });

  it('lands no description for a filing nobody described', async () => {
    await runItem([
      'file',
      '--title',
      'A described nothing',
      '--kind',
      'chore',
      '--size',
      'trivial',
    ]);

    expect((await filed('K-2'))?.description).toBeUndefined();
  });
});
