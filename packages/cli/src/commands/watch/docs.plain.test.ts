import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceDoc } from '../../shared/journey.ts';

import { foldJourney } from '../../shared/journey.ts';
import { stamped } from '../../shared/plain-state.ts';
import { docsFor } from './docs.ts';

const TECH = '# The spec\n\nFive failures lock the account.\n';

const LOG = [
  JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: 'designing',
    item: 'K-1',
    at: '2026-08-07T09:00:00.000Z',
  }),
  JSON.stringify({
    gate: 'write',
    outcome: 'allowed',
    about: '.ket/items/K-1/spec.md',
    item: 'K-1',
    at: '2026-08-07T09:10:00.000Z',
  }),
  '',
].join('\n');

const STORED = [
  {
    key: 'K-1',
    contents:
      'title: The watched item\nkind: feature\nsize: story\nstatus: designing\nchildren: []\n',
  },
];

let itemDir = '';

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-plain-'));
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

async function specDoc(): Promise<SurfaceDoc | undefined> {
  const journey = foldJourney(STORED, LOG, 'K-1');

  if (journey === undefined) {
    throw new Error('the fixture journey never folded');
  }

  const grown = await docsFor(itemDir, LOG, journey);

  return grown.nodes.find((node) => node.title === 'spec.md')?.doc;
}

describe('the plain sibling a prose doc wears', () => {
  it('keeps the note quiet where the plain sibling is fresh', async () => {
    await writeFile(join(itemDir, 'spec.md'), TECH);
    await writeFile(join(itemDir, 'spec.plain.md'), stamped(TECH, 'Five tries and you wait.\n'));

    const doc = await specDoc();

    expect(doc?.kind === 'prose' ? doc.note : 'never folded').toBeUndefined();
  });

  it('folds a plain sibling standing alone, worn with the lag note', async () => {
    await writeFile(join(itemDir, 'spec.plain.md'), 'Five tries and you wait.\n');

    const doc = await specDoc();

    expect(doc?.kind).toBe('prose');

    if (doc?.kind === 'prose') {
      expect(doc.tech).toBe('');
      expect(doc.plain).toContain('Five tries and you wait.');
      expect(doc.note).toBe('Plain version lags behind its source.');
    }
  });

  it('leaves the shelf empty where neither side was written', async () => {
    expect(await specDoc()).toBeUndefined();
  });
});
