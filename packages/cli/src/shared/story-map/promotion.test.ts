import { describe, expect, it } from 'vitest';

import type { MapReading, StoryMap } from './schema.ts';

import { promotionOf } from './promotion.ts';

const MAP: StoryMap = {
  version: 1,
  product: { name: 'shop', idea: 'a place to buy a thing' },
  users: [],
  releases: [
    {
      id: 'r-skeleton',
      name: 'walking skeleton',
      outcome: 'a shopper completes one real purchase',
      metric: 'one paid order lands in the ledger',
    },
  ],
  activities: [
    {
      id: 'a-buy',
      name: 'buy a thing',
      steps: [
        {
          id: 's-browse',
          name: 'browse the catalog',
          stories: [{ id: 'st-see', name: 'see what is for sale', release: 'r-skeleton' }],
        },
      ],
    },
  ],
};

const READ: MapReading = { map: MAP };

function refusalOf(reading: MapReading, id: string): string {
  const promotion = promotionOf(reading, id);

  return 'refused' in promotion ? promotion.refused : '';
}

describe('choosing the story a filing is promoted from', () => {
  it('chooses the story the map declares under that id', () => {
    expect(promotionOf(READ, 'st-see')).toStrictEqual({
      story: { id: 'st-see', name: 'see what is for sale', release: 'r-skeleton' },
    });
  });

  it('refuses a story the map never declared, naming the id and the map file', () => {
    expect(refusalOf(READ, 'st-nowhere')).toBe('.ket/story-map.yaml declares no story st-nowhere');
  });

  it('refuses against a map that is not there, naming the id and the map file', () => {
    expect(refusalOf({ absent: true }, 'st-see')).toBe(
      '.ket/story-map.yaml is not there, so nothing declares the story st-see',
    );
  });

  it('refuses against a map nothing can read, and carries why it cannot', () => {
    expect(refusalOf({ refusals: ['the map is not version 1'] }, 'st-see')).toBe(
      '.ket/story-map.yaml cannot be read, so nothing declares the story st-see: the map is not version 1',
    );
  });

  it('carries every reason a map nothing can read gave', () => {
    expect(refusalOf({ refusals: ['one thing', 'another thing'] }, 'st-see')).toContain(
      'one thing; another thing',
    );
  });

  it('refuses rather than throwing, so the caller decides what to say', () => {
    expect(() => promotionOf({ absent: true }, 'st-see')).not.toThrow();
  });
});
