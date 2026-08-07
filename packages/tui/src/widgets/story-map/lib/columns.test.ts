import { describe, expect, it } from 'vitest';

import type { MapBandView, MapRibView } from '../../../shared/model';

import { cardsUnder, columnsOf } from './columns.ts';

const SPINE: MapRibView[] = [
  {
    activity: 'buy a thing',
    steps: [
      { id: 's-browse', name: 'browse the catalog' },
      { id: 's-pay', name: 'pay for it' },
    ],
  },
  { activity: 'return a thing', steps: [{ id: 's-ask', name: 'ask for a refund' }] },
];

const BAND: MapBandView = {
  id: 'r-skeleton',
  name: 'walking skeleton',
  outcome: 'one real purchase',
  cards: [
    { id: 'st-see', name: 'see what is for sale', step: 's-browse' },
    { id: 'st-card', name: 'pay by card', step: 's-pay' },
    { id: 'st-search', name: 'search the catalog', step: 's-browse' },
  ],
};

describe('the columns the backbone lays across the top', () => {
  it('gives every step a column, in the order the map wrote them', () => {
    expect(columnsOf(SPINE).map((column) => column.id)).toStrictEqual([
      's-browse',
      's-pay',
      's-ask',
    ]);
  });

  it('tells each column which activity it hangs under', () => {
    expect(columnsOf(SPINE)).toStrictEqual([
      { id: 's-browse', name: 'browse the catalog', activity: 'buy a thing' },
      { id: 's-pay', name: 'pay for it', activity: 'buy a thing' },
      { id: 's-ask', name: 'ask for a refund', activity: 'return a thing' },
    ]);
  });

  it('lays no column for an activity nobody has broken into steps', () => {
    expect(columnsOf([{ activity: 'a bare idea', steps: [] }])).toStrictEqual([]);
  });
});

describe('the cards a column holds inside a band', () => {
  it('holds the cards whose story hangs under that step, in band order', () => {
    expect(cardsUnder(BAND, 's-browse').map((card) => card.id)).toStrictEqual([
      'st-see',
      'st-search',
    ]);
  });

  it('holds nothing for a step this band never reached', () => {
    expect(cardsUnder(BAND, 's-ask')).toStrictEqual([]);
  });
});
