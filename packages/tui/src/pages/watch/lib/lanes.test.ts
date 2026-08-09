import { describe, expect, it } from 'vitest';

import type { KanbanColumnView } from '../../../shared/model';

import { laneLeast, lanesOverflowAcross, laneTitle } from './lanes.ts';

function lanesOf(statuses: string[]): KanbanColumnView[] {
  return statuses.map((status) => ({ status, cards: [] }));
}

const EVEN = lanesOf(['ok', 'go']);

const UNEVEN = lanesOf(['ok', 'go', 'awaiting-approval']);

describe('the title a lane wears', () => {
  it('spells the status beside the count it holds', () => {
    expect(laneTitle({ status: 'triaged', cards: [] })).toBe(' triaged 0 ');
  });

  it('carries the true total and names the cap where the lane shows less', () => {
    const lane: KanbanColumnView = {
      status: 'shipped',
      cards: Array.from({ length: 5 }, (_, held) => ({
        key: `K-${String(held)}`,
        title: 'shipped work',
        size: 'story',
        status: 'shipped',
        parent: undefined,
        since: undefined,
        refusal: undefined,
        note: undefined,
        offers: [],
      })),
    };

    expect(laneTitle(lane, 12)).toBe(' shipped 12 · last 5 ');
    expect(laneTitle(lane, 5)).toBe(' shipped 5 ');
  });
});

describe('the least width a lane accepts', () => {
  it('leaves the widest title the room a box needs to draw it', () => {
    expect(laneLeast(UNEVEN)).toBe(' awaiting-approval 0 '.length + 4);
  });

  it('measures every lane against the widest status, not its own', () => {
    expect(laneLeast(EVEN)).toBe(' ok 0 '.length + 4);
  });
});

describe('the room a row of lanes overflows', () => {
  it('overflows where the row cannot seat every lane at its least width', () => {
    expect(lanesOverflowAcross(EVEN, 19)).toBe(true);
  });

  it('fits where the row seats every lane at its least width', () => {
    expect(lanesOverflowAcross(EVEN, 20)).toBe(false);
  });
});
