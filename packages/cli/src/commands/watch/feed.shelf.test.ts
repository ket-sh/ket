import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseItem } from '../../shared/read-item.ts';
import { boardFeedFor } from './feed.ts';

const MAP_SOURCE = [
  'version: 1',
  'product:',
  '  name: shop',
  '  idea: a place to buy a thing',
  'users: []',
  'releases:',
  '  - id: r-skeleton',
  '    name: walking skeleton',
  '    outcome: a shopper completes one real purchase',
  '    metric: one paid order lands in the ledger',
  'activities:',
  '  - id: a-buy',
  '    name: buy a thing',
  '    steps:',
  '      - id: s-browse',
  '        name: browse the catalog',
  '        stories:',
  '          - id: st-see',
  '            name: see what is for sale',
  '            release: r-skeleton',
  '          - id: st-card',
  '            name: pay by card',
  '',
].join('\n');

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-shelf-'));
  await mkdir(join(root, '.ket', 'items'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets:\n  .: cli\n');
  await writeFile(join(root, '.ket', 'story-map.yaml'), MAP_SOURCE);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function feed(): ReturnType<typeof boardFeedFor> {
  return boardFeedFor(root, { debounce: 5, poll: 10_000 }, () => () => undefined);
}

async function filedItem(key: string): Promise<ReturnType<typeof parseItem>> {
  return parseItem(
    await readFile(join(root, '.ket', 'items', key, 'item.yaml'), 'utf8').catch(() => ''),
  );
}

describe('the unfiled stories the watch shelf reads', () => {
  it('stands the release in focus with the stories nothing was filed for', async () => {
    const shelf = await feed().unfiledShelf();

    expect(shelf.release).toStrictEqual({ id: 'r-skeleton', name: 'walking skeleton' });
    expect(shelf.stories.map((story) => story.id)).toStrictEqual(['st-see']);
    expect(shelf.unassigned.map((story) => story.id)).toStrictEqual(['st-card']);
  });

  it('drops a story once an item carries it', async () => {
    await feed().promote('st-see');

    const shelf = await feed().unfiledShelf();

    expect(shelf.stories.map((story) => story.id)).toStrictEqual([]);
  });

  it('stands nothing where no map is there to read', async () => {
    await rm(join(root, '.ket', 'story-map.yaml'));

    const shelf = await feed().unfiledShelf();

    expect(shelf).toStrictEqual({ release: undefined, stories: [], unassigned: [] });
  });
});

describe('promoting a story off the shelf into the backlog', () => {
  it('files an item carrying the story id and the title the map gave it', async () => {
    const promoted = await feed().promote('st-see');

    expect(promoted).toStrictEqual({ filed: 'K-1' });
    await expect(filedItem('K-1')).resolves.toMatchObject({
      title: 'see what is for sale',
      status: 'triaged',
      story: 'st-see',
    });
  });

  it('refuses a story the map never declared, naming the id and the map file', async () => {
    await expect(feed().promote('st-nowhere')).resolves.toStrictEqual({
      refused: '.ket/story-map.yaml declares no story st-nowhere',
    });
  });

  it('files nothing at all when the story is not one the map declares', async () => {
    await feed().promote('st-nowhere');

    await expect(filedItem('K-1')).resolves.toBeUndefined();
  });

  it('leaves the arrival at triaged in the log the board folds from', async () => {
    await feed().promote('st-see');

    const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8');

    expect(log).toContain('"item":"K-1"');
    expect(log).toContain('"about":"triaged"');
  });
});
