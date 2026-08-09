import { describe, expect, it } from 'vitest';

import type { MapBandView } from '../../../shared/model';
import type { MapColumn } from './columns.ts';

import { bandHeightOf, cardLinesOf, columnWidthsOf, shownBandsOf } from './frame.ts';

const COLUMNS: MapColumn[] = [
  { id: 's-playbook', name: 'pick the playbook', activity: 'start the launch' },
  { id: 's-check', name: 'check off a step', activity: 'work the steps' },
];

function bandWith(cards: MapBandView['cards']): MapBandView {
  return { id: 'r-skeleton', name: 'walking skeleton', outcome: 'a launch lands', cards };
}

describe('the width every column owns inside a band', () => {
  it('splits the interior between the columns, leftovers leftmost', () => {
    expect(columnWidthsOf(200, 8)).toEqual([25, 25, 25, 25, 24, 24, 24, 24]);
  });

  it('gives a lone column the whole interior', () => {
    expect(columnWidthsOf(80, 1)).toEqual([76]);
  });

  it('owns up to a spine with no steps', () => {
    expect(columnWidthsOf(80, 0)).toEqual([]);
  });

  it('never deals a negative width from a sliver of a terminal', () => {
    for (const width of columnWidthsOf(3, 8)) {
      expect(width).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the lines a card name folds into', () => {
  it('keeps a short name on one line', () => {
    expect(cardLinesOf('tick a step done', 25)).toEqual(['tick a step done']);
  });

  it('folds a long name at the card interior, four cells inside the column', () => {
    expect(cardLinesOf('start a launch from the playbook', 25)).toEqual([
      'start a launch from',
      'the playbook',
    ]);
  });

  it('folds nothing when the column has no room for a card', () => {
    expect(cardLinesOf('tick a step done', 4)).toEqual([]);
  });
});

describe('the height a band needs', () => {
  it('stacks the tallest column of cards, a margin row, and both borders', () => {
    const band = bandWith([
      { id: 'st-see', name: 'see the built-in playbook', step: 's-playbook', user: 'u-dev' },
      { id: 'st-start', name: 'start a launch from the playbook', step: 's-playbook' },
      { id: 'st-tick', name: 'tick a step done', step: 's-check' },
    ]);

    expect(bandHeightOf(band, COLUMNS, [25, 25])).toBe(11);
  });

  it('keeps an empty band at its frame and margin', () => {
    expect(bandHeightOf(bandWith([]), COLUMNS, [25, 25])).toBe(3);
  });
});

describe('the bands a room can seat whole', () => {
  const bands = [
    bandWith([
      { id: 'st-see', name: 'see the built-in playbook', step: 's-playbook' },
      { id: 'st-start', name: 'start a launch from the playbook', step: 's-playbook' },
    ]),
    bandWith([{ id: 'st-tick', name: 'tick a step done', step: 's-check' }]),
    bandWith([]),
  ];

  it('seats every band the room holds', () => {
    expect(shownBandsOf(bands, COLUMNS, [25, 25], 30)).toBe(3);
  });

  it('stops before the band that would straddle the edge', () => {
    expect(shownBandsOf(bands, COLUMNS, [25, 25], 12)).toBe(1);
  });

  it('seats none when even the first band cannot sit whole', () => {
    expect(shownBandsOf(bands, COLUMNS, [25, 25], 5)).toBe(0);
  });
});
