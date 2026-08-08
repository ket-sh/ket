import { describe, expect, it } from 'vitest';

import type { MapBandView } from '../../../shared/model';

import { detailOf, seatsOf, walkedTo } from './spot.ts';

const BANDS: MapBandView[] = [
  {
    id: 'r-skeleton',
    name: 'walking skeleton',
    outcome: 'one real purchase',
    cards: [
      { id: 'st-see', name: 'see what is for sale', step: 's-browse', user: 'u-shopper' },
      { id: 'st-card', name: 'pay by card', step: 's-pay' },
    ],
  },
  { id: 'r-next', name: 'the next cut', outcome: 'a shopper comes back', cards: [] },
  {
    id: undefined,
    name: 'unassigned',
    outcome: undefined,
    cards: [{ id: 'st-search', name: 'search the catalog', step: 's-browse' }],
  },
];

describe('the seats a map offers the selection', () => {
  it('runs the seats band by band, in the order the bands were cut', () => {
    expect(seatsOf(BANDS).map((seat) => seat.card.id)).toStrictEqual([
      'st-see',
      'st-card',
      'st-search',
    ]);
  });

  it('tells each seat which band it sits in', () => {
    expect(seatsOf(BANDS).map((seat) => seat.band.name)).toStrictEqual([
      'walking skeleton',
      'walking skeleton',
      'unassigned',
    ]);
  });

  it('offers no seat at all on a map with nothing on it', () => {
    expect(seatsOf([])).toStrictEqual([]);
  });
});

describe('the walk the arrows take', () => {
  it('steps forward one card at a time', () => {
    expect(walkedTo(3, 0, 1)).toBe(1);
  });

  it('steps back one card at a time', () => {
    expect(walkedTo(3, 2, -1)).toBe(1);
  });

  it('stays on the last card rather than walking off the end', () => {
    expect(walkedTo(3, 2, 1)).toBe(2);
  });

  it('stays on the first card rather than walking off the front', () => {
    expect(walkedTo(3, 0, -1)).toBe(0);
  });

  it('rests at nothing when the map offers no seat', () => {
    expect(walkedTo(0, 0, 1)).toBe(0);
  });
});

describe('the detail line under the selected card', () => {
  it('spells the story, the user it belongs to, and the release it sits in', () => {
    expect(detailOf(seatsOf(BANDS)[0])).toBe('see what is for sale · u-shopper · walking skeleton');
  });

  it('leaves out the user when the story named nobody', () => {
    expect(detailOf(seatsOf(BANDS)[1])).toBe('pay by card · walking skeleton');
  });

  it('names the bucket as the release when the story points nowhere', () => {
    expect(detailOf(seatsOf(BANDS)[2])).toBe('search the catalog · unassigned');
  });

  it('says nothing at all when no card is selected', () => {
    expect(detailOf(undefined)).toBe('');
  });
});
