import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';
import type { ShelfSpot } from './shelf.ts';

import { bindingsAt, hintOf } from './bindings.ts';

const BARE: ShelfSpot = { rows: 0, unassigned: 0, whole: false };

function hintsAt(spot: BindingSpot): string[] {
  return bindingsAt(spot).map((binding) => hintOf(binding));
}

describe('the bindings the board answers', () => {
  it('walks, dives, switches views, and keeps the way out last', () => {
    expect(
      hintsAt({ kind: 'board', layout: 'kanban', offers: [], holds: true, shelf: BARE }),
    ).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'm map',
      'v list',
      'b backlog',
      'x archive',
      'l log',
      'd docs',
      '/ filter',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });

  it('offers the gate keys the chosen card offers, right after the dive', () => {
    expect(
      hintsAt({
        kind: 'board',
        layout: 'kanban',
        offers: ['approve', 'ship'],
        holds: true,
        shelf: BARE,
      }),
    ).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'a approve',
      's ship',
      'm map',
      'v list',
      'b backlog',
      'x archive',
      'l log',
      'd docs',
      '/ filter',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });
});

describe('the view each layout key names', () => {
  it('names the view each layout key would land on from the list', () => {
    const hints = hintsAt({ kind: 'board', layout: 'list', offers: [], holds: true, shelf: BARE });

    expect(hints).toContain('v kanban');
    expect(hints).toContain('b backlog');
    expect(hints).toContain('/ filter');
  });
});

describe('the bindings an idle or queued board answers', () => {
  it('names the way back to the board from the backlog', () => {
    const hints = hintsAt({
      kind: 'board',
      layout: 'backlog',
      offers: [],
      holds: true,
      shelf: BARE,
    });

    expect(hints).toContain('b board');
    expect(hints).toContain('v kanban');
    expect(hints).not.toContain('/ filter');
  });

  it('drops the hints that act on nothing where the board holds no card', () => {
    expect(
      hintsAt({ kind: 'board', layout: 'kanban', offers: [], holds: false, shelf: BARE }),
    ).toStrictEqual([
      'm map',
      'v list',
      'b backlog',
      'x archive',
      'l log',
      'd docs',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });

  it('names the way back to the board from the archive', () => {
    const hints = hintsAt({
      kind: 'board',
      layout: 'archive',
      offers: [],
      holds: true,
      shelf: BARE,
    });

    expect(hints).toContain('x board');
    expect(hints).toContain('b backlog');
    expect(hints).not.toContain('/ filter');
  });
});
