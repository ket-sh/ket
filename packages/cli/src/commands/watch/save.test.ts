import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boardFeedFor } from './feed.ts';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-save-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('saving criteria through the feed', () => {
  it('writes the feature file inside the item and records the write', async () => {
    await boardFeedFor(root).saveCriteria('K-1', 'locking.feature', 'Feature: locking\n');

    await expect(
      readFile(join(root, '.ket', 'items', 'K-1', 'locking.feature'), 'utf8'),
    ).resolves.toBe('Feature: locking\n');

    const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8');

    expect(log).toContain('"gate":"write"');
    expect(log).toContain('"outcome":"allowed"');
    expect(log).toContain('.ket/items/K-1/locking.feature');
  });

  it('refuses a name that escapes the item directory', async () => {
    await expect(
      boardFeedFor(root).saveCriteria('K-1', '../escape.feature', 'Feature: escape\n'),
    ).rejects.toThrow(/inside/);

    await expect(readFile(join(root, '.ket', 'items', 'escape.feature'), 'utf8')).rejects.toThrow();
  });

  it('refuses anything but a feature file', async () => {
    await expect(
      boardFeedFor(root).saveCriteria('K-1', 'notes.md', 'not criteria\n'),
    ).rejects.toThrow(/feature/);
  });
});
