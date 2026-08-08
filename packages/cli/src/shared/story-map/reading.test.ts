import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mapShowingIn, readMapIn } from './reading.ts';

const MAP = `version: 1
product:
  name: shop
  idea: a place to buy a thing
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: one real purchase
    metric: one paid order
activities:
  - id: a-buy
    name: buy a thing
    steps:
      - id: s-browse
        name: browse the catalog
        stories:
          - id: st-see
            name: see what is for sale
            release: r-skeleton
`;

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-map-reading-'));
  await mkdir(join(root, '.ket'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function wrote(contents: string): Promise<void> {
  await writeFile(join(root, '.ket', 'story-map.yaml'), contents);
}

describe('reading the map a project keeps', () => {
  it('reads a project that never wrote one as absent', async () => {
    expect(await readMapIn(root)).toStrictEqual({ absent: true });
  });

  it('reads the map out of the ket directory', async () => {
    await wrote(MAP);

    const reading = await readMapIn(root);

    expect('map' in reading && reading.map.product.name).toBe('shop');
  });

  it('carries a refusal back rather than throwing it', async () => {
    await wrote(MAP.replace('release: r-skeleton', 'release: r-gone'));

    expect(await readMapIn(root)).toStrictEqual({
      refusals: ['the story st-see points at r-gone, which no release declares'],
    });
  });

  it('looks only inside the ket directory, never beside it', async () => {
    await writeFile(join(root, 'story-map.yaml'), MAP);

    expect(await readMapIn(root)).toStrictEqual({ absent: true });
  });
});

describe('what the screen is handed', () => {
  it('folds a readable map into bands the screen can draw', async () => {
    await wrote(MAP);

    const showing = await mapShowingIn(root);

    expect('map' in showing && showing.map.bands.map((band) => band.name)).toStrictEqual([
      'walking skeleton',
      'unassigned',
    ]);
  });

  it('hands absence straight through, so the screen can say how to start', async () => {
    expect(await mapShowingIn(root)).toStrictEqual({ absent: true });
  });

  it('hands the refusals straight through rather than folding a map it has not got', async () => {
    await wrote(MAP.replace('release: r-skeleton', 'release: r-gone'));

    expect(await mapShowingIn(root)).toStrictEqual({
      refusals: ['the story st-see points at r-gone, which no release declares'],
    });
  });
});
