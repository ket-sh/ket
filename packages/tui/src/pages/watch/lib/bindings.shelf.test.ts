import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';
import type { ShelfSpot } from './shelf.ts';

import { bindingsAt, hintOf } from './bindings.ts';

const BARE: ShelfSpot = { rows: 0, spare: 0, whole: false };

const STOOD: ShelfSpot = { rows: 2, spare: 1, whole: false };

const WIDENED: ShelfSpot = { rows: 3, spare: 1, whole: true };

function queuedWith(shelf: ShelfSpot): BindingSpot {
  return { kind: 'board', layout: 'backlog', offers: [], holds: true, shelf };
}

function hintsAt(spot: BindingSpot): string[] {
  return bindingsAt(spot).map((binding) => hintOf(binding));
}

describe('the bindings the unfiled shelf adds to the backlog', () => {
  it('names every key the backlog answers once the shelf stands a story', () => {
    expect(hintsAt(queuedWith(STOOD))).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'p promote',
      'm map',
      'v kanban',
      'b board',
      'x archive',
      'u unassigned',
      'l log',
      'd docs',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });

  it('leaves the backlog exactly as it was where nothing is unfiled', () => {
    expect(hintsAt(queuedWith(BARE))).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'm map',
      'v kanban',
      'b board',
      'x archive',
      'l log',
      'd docs',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });
});

describe('the unassigned bucket the shelf keys reach', () => {
  it('names the release as the way back once the bucket is in', () => {
    const hints = hintsAt(queuedWith(WIDENED));

    expect(hints).toContain('u release');
    expect(hints).not.toContain('u unassigned');
  });

  it('offers the bucket, but nothing to promote, where only the bucket holds stories', () => {
    const hints = hintsAt(queuedWith({ rows: 0, spare: 2, whole: false }));

    expect(hints).toContain('u unassigned');
    expect(hints).not.toContain('p promote');
  });

  it('keeps the shelf keys off the board layouts that stand no shelf', () => {
    const hints = hintsAt({
      kind: 'board',
      layout: 'kanban',
      offers: [],
      holds: true,
      shelf: STOOD,
    });

    expect(hints).not.toContain('p promote');
    expect(hints).not.toContain('u unassigned');
  });
});
