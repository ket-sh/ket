import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';

import { bindingsAt, hintOf } from './bindings.ts';

function hintsAt(spot: BindingSpot): string[] {
  return bindingsAt(spot).map((binding) => hintOf(binding));
}

type JourneySpot = Extract<BindingSpot, { kind: 'journey' }>;

function journeySpot(pane: JourneySpot['pane']): JourneySpot {
  return { kind: 'journey', pane, wide: false, offers: [] };
}

describe('the bindings the journey answers', () => {
  it('moves, opens, widens, and falls back to the board from the canvas', () => {
    expect(hintsAt(journeySpot('canvas'))).toStrictEqual([
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
    expect(hintsAt(journeySpot('brink'))).toStrictEqual([
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
    expect(hintsAt(journeySpot('held'))).toStrictEqual([
      '← canvas',
      '⏎ children',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });
});

describe('the width and the gates the journey bindings carry', () => {
  it('offers the way back to the split while one legend fills the width', () => {
    expect(hintsAt({ ...journeySpot('canvas'), wide: true })).toContain('f split');
  });

  it('offers the gate keys the pane extends, right after the moves', () => {
    const hints = hintsAt({ ...journeySpot('canvas'), offers: ['approve'] });

    expect(hints).toContain('a approve');
    expect(hints.indexOf('a approve')).toBeLessThan(hints.indexOf('f full'));
  });

  it('hands the overview preview its scroll instead of the canvas walk', () => {
    expect(hintsAt(journeySpot('preview'))).toStrictEqual([
      '↑↓ j k scroll',
      'f full',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });
});

describe('the bindings the focused chrome answers', () => {
  it('walks the tabs while the tab row holds the focus', () => {
    expect(hintsAt(journeySpot('tabs'))).toStrictEqual([
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
    expect(hintsAt(journeySpot('reading'))).toStrictEqual([
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

  it('holds the ceremony to pass or cancel while it still asks', () => {
    expect(hintsAt({ kind: 'gate', asks: true })).toStrictEqual(['⏎ pass', 'esc cancel']);
  });

  it('offers only the way out once the ceremony has answered', () => {
    expect(hintsAt({ kind: 'gate', asks: false })).toStrictEqual(['esc close']);
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
