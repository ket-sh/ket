import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';

import { bindingsAt, hintOf } from './bindings.ts';

function hintsAt(spot: BindingSpot): string[] {
  return bindingsAt(spot).map((binding) => hintOf(binding));
}

describe('the bindings the board answers', () => {
  it('walks, dives, switches views, and keeps the way out last', () => {
    expect(hintsAt({ kind: 'board', layout: 'kanban', offers: [], holds: true })).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'm map',
      'v list',
      'b backlog',
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
      hintsAt({ kind: 'board', layout: 'kanban', offers: ['approve', 'ship'], holds: true }),
    ).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'a approve',
      's ship',
      'm map',
      'v list',
      'b backlog',
      'l log',
      'd docs',
      '/ filter',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });

  it('names the view each layout key would land on from the list', () => {
    const hints = hintsAt({ kind: 'board', layout: 'list', offers: [], holds: true });

    expect(hints).toContain('v kanban');
    expect(hints).toContain('b backlog');
    expect(hints).toContain('/ filter');
  });
});

describe('the bindings an idle or queued board answers', () => {
  it('names the way back to the board from the backlog', () => {
    const hints = hintsAt({ kind: 'board', layout: 'backlog', offers: [], holds: true });

    expect(hints).toContain('b board');
    expect(hints).toContain('v kanban');
    expect(hints).not.toContain('/ filter');
  });

  it('drops the hints that act on nothing where the board holds no card', () => {
    expect(hintsAt({ kind: 'board', layout: 'kanban', offers: [], holds: false })).toStrictEqual([
      'm map',
      'v list',
      'b backlog',
      'l log',
      'd docs',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });
});

describe('the bindings the journey answers', () => {
  it('moves, opens, widens, and falls back to the board from the canvas', () => {
    expect(hintsAt({ kind: 'journey', pane: 'canvas', wide: false })).toStrictEqual([
      '←↑↓→ move',
      '⏎ open',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('says the pane is one arrow away where the canvas runs out', () => {
    expect(hintsAt({ kind: 'journey', pane: 'brink', wide: false })).toStrictEqual([
      '←↑↓→ move',
      '→ item pane',
      '⏎ open',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('hands enter to the children once the pane holds the selection', () => {
    expect(hintsAt({ kind: 'journey', pane: 'held', wide: false })).toStrictEqual([
      '← canvas',
      '⏎ children',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('offers the way back to the split while one legend fills the width', () => {
    expect(hintsAt({ kind: 'journey', pane: 'canvas', wide: true })).toContain('f split');
  });
});

describe('the bindings the focused chrome answers', () => {
  it('walks the tabs while the tab row holds the focus', () => {
    expect(hintsAt({ kind: 'journey', pane: 'tabs', wide: false })).toStrictEqual([
      '←→ tabs',
      '↓ panel',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('reads the doc while the content holds the focus', () => {
    expect(hintsAt({ kind: 'journey', pane: 'reading', wide: false })).toStrictEqual([
      '↑↓ j k read',
      '← files',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });
});

describe('the bindings the map and the log answer', () => {
  it('lets the map walk and leave', () => {
    expect(hintsAt({ kind: 'map', holds: true })).toStrictEqual([
      '←↑↓→ move',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('keeps only the ways out where no story map exists to walk', () => {
    expect(hintsAt({ kind: 'map', holds: false })).toStrictEqual([
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('lets the operation log walk, dive, narrow, and leave', () => {
    expect(hintsAt({ kind: 'oplog', holds: true })).toStrictEqual([
      '↑↓ move',
      '⏎ journey',
      '/ filter',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('keeps only the ways out where the log holds no event', () => {
    expect(hintsAt({ kind: 'oplog', holds: false })).toStrictEqual([
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });
});

describe('the bindings the held screens answer', () => {
  it('lets the surface scroll, retune, edit, and leave', () => {
    expect(hintsAt({ kind: 'surface' })).toStrictEqual([
      '↑↓ scroll',
      'tab ←→ audience',
      'e edit',
      'ctrl+p go',
      '? help',
      'esc back',
      'q quit',
    ]);
  });

  it('holds the ceremony to pass or cancel', () => {
    expect(hintsAt({ kind: 'gate' })).toStrictEqual(['⏎ pass', 'esc cancel']);
  });

  it('holds the editor to typing, saving, and leaving', () => {
    expect(hintsAt({ kind: 'edit' })).toStrictEqual(['type', 'ctrl+s save', 'esc back']);
  });
});

describe('the bindings the docs screen answers', () => {
  it('lets the catalog walk, open the detail, and leave', () => {
    expect(hintsAt({ kind: 'docs', focus: 'catalog', holds: true })).toStrictEqual([
      '↑↓ move',
      '⏎ detail',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('keeps only the ways out where the catalog holds no page', () => {
    expect(hintsAt({ kind: 'docs', focus: 'catalog', holds: false })).toStrictEqual([
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('hands the detail its way back to the catalog', () => {
    expect(hintsAt({ kind: 'docs', focus: 'detail', holds: true })).toStrictEqual([
      '↑↓ move',
      'esc catalog',
      'ctrl+p go',
      '? help',
      'q quit',
    ]);
  });
});
