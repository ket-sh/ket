import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boardFeedFor } from './feed.ts';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-journey-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  );
  await writeFile(
    join(root, '.ket', 'events.jsonl'),
    [
      '{"gate":"transition","outcome":"allowed","about":"triaged","item":"K-1","at":"2026-08-07T09:00:00.000Z"}',
      '{"gate":"transition","outcome":"allowed","about":"designing","item":"K-1","at":"2026-08-07T10:00:00.000Z"}',
      '{"gate":"write","outcome":"allowed","about":".ket/items/K-1/spec.md","item":"K-1","at":"2026-08-07T11:00:00.000Z"}',
      '',
    ].join('\n'),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the journey the feed serves', () => {
  it('folds the store and the log into the asked journey', async () => {
    const journey = await boardFeedFor(root).journey('K-1');

    expect(journey?.title).toBe('The watched item');
    expect(journey?.nodes.map((node) => node.id)).toStrictEqual([
      'triaged',
      'designing',
      'awaiting-approval',
      '.ket/items/K-1/spec.md',
    ]);
  });

  it('serves nothing for a key the store never held', async () => {
    expect(await boardFeedFor(root).journey('GONE-9')).toBeUndefined();
  });
});
