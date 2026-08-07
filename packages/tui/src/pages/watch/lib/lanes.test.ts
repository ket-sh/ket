import { describe, expect, it } from 'vitest';

import type { KanbanColumnView } from '../../../shared/model';

import { laidInRow, laneTitle } from './lanes.ts';

function lanesOf(statuses: string[]): KanbanColumnView[] {
  return statuses.map((status) => ({ status, cards: [] }));
}

const EVEN = lanesOf(['ok', 'go']);

const UNEVEN = lanesOf(['ok', 'go', 'awaiting-approval']);

describe('the title a lane wears', () => {
  it('spells the status beside the count it holds', () => {
    expect(laneTitle({ status: 'triaged', cards: [] })).toBe(' triaged 0 ');
  });
});

describe('the room a row of lanes asks for', () => {
  it('lays the lanes in a row where every one can spell its status', () => {
    expect(laidInRow(EVEN, 16)).toBe(true);
  });

  it('gives the row up one cell short of that room', () => {
    expect(laidInRow(EVEN, 15)).toBe(false);
  });

  it('measures every lane against the widest status, not its own', () => {
    expect(laidInRow(UNEVEN, 69)).toBe(true);
    expect(laidInRow(UNEVEN, 68)).toBe(false);
  });
});
