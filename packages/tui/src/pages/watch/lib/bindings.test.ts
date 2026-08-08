import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';

import { bindingsAt, groupedOf, hintOf } from './bindings.ts';

function hintsAt(spot: BindingSpot): string[] {
  return bindingsAt(spot).map((binding) => hintOf(binding));
}

function groupAt(spot: BindingSpot, hint: string): string | undefined {
  return bindingsAt(spot).find((binding) => hintOf(binding) === hint)?.group;
}

describe('the bindings the board answers', () => {
  it('walks, dives, switches views, and keeps the way out last', () => {
    expect(hintsAt({ kind: 'board', layout: 'kanban', offers: [] })).toStrictEqual([
      '←↑↓→ move',
      '⏎ journey',
      'm map',
      'v list',
      'b backlog',
      '/ filter',
      'ctrl+p go',
      '? help',
      'r refresh',
      'q quit',
    ]);
  });

  it('offers the gate keys the chosen card offers, right after the dive', () => {
    expect(hintsAt({ kind: 'board', layout: 'kanban', offers: ['approve', 'ship'] })).toStrictEqual(
      [
        '←↑↓→ move',
        '⏎ journey',
        'a approve',
        's ship',
        'm map',
        'v list',
        'b backlog',
        '/ filter',
        'ctrl+p go',
        '? help',
        'r refresh',
        'q quit',
      ],
    );
  });

  it('names the view each layout key would land on from the list', () => {
    const hints = hintsAt({ kind: 'board', layout: 'list', offers: [] });

    expect(hints).toContain('v kanban');
    expect(hints).toContain('b backlog');
    expect(hints).toContain('/ filter');
  });

  it('names the way back to the board from the backlog', () => {
    const hints = hintsAt({ kind: 'board', layout: 'backlog', offers: [] });

    expect(hints).toContain('b board');
    expect(hints).toContain('v kanban');
    expect(hints).not.toContain('/ filter');
  });
});

describe('the bindings the journey answers', () => {
  it('moves, opens, and falls back to the board from the canvas', () => {
    expect(hintsAt({ kind: 'journey', pane: 'canvas' })).toStrictEqual([
      '←↑↓→ move',
      '⏎ open',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('says the pane is one arrow away where the canvas runs out', () => {
    expect(hintsAt({ kind: 'journey', pane: 'brink' })).toStrictEqual([
      '←↑↓→ move',
      '→ item pane',
      '⏎ open',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

  it('hands enter to the children once the pane holds the selection', () => {
    expect(hintsAt({ kind: 'journey', pane: 'held' })).toStrictEqual([
      '← canvas',
      '⏎ children',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });
});

describe('the bindings the other screens answer', () => {
  it('lets the map walk and leave', () => {
    expect(hintsAt({ kind: 'map' })).toStrictEqual([
      '←↑↓→ move',
      'ctrl+p go',
      '? help',
      'esc board',
      'q quit',
    ]);
  });

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

describe('the group every binding wears', () => {
  it('files the walk under move and the dive under open', () => {
    const board: BindingSpot = { kind: 'board', layout: 'kanban', offers: ['approve'] };

    expect(groupAt(board, '←↑↓→ move')).toBe('move');
    expect(groupAt(board, '⏎ journey')).toBe('open');
    expect(groupAt(board, 'q quit')).toBe('open');
  });

  it('files the gate keys and the refresh under tools', () => {
    const board: BindingSpot = { kind: 'board', layout: 'kanban', offers: ['approve'] };

    expect(groupAt(board, 'a approve')).toBe('tools');
    expect(groupAt(board, 'r refresh')).toBe('tools');
  });

  it('files the slash under filter', () => {
    const board: BindingSpot = { kind: 'board', layout: 'kanban', offers: [] };

    expect(groupAt(board, '/ filter')).toBe('filter');
  });

  it('files the palette under open, wherever it appears', () => {
    expect(groupAt({ kind: 'board', layout: 'kanban', offers: [] }, 'ctrl+p go')).toBe('open');
    expect(groupAt({ kind: 'map' }, 'ctrl+p go')).toBe('open');
  });

  it('files the help key under tools, wherever it appears', () => {
    expect(groupAt({ kind: 'board', layout: 'kanban', offers: [] }, '? help')).toBe('tools');
    expect(groupAt({ kind: 'surface' }, '? help')).toBe('tools');
  });
});

describe('the grouping the help screen reads', () => {
  it('walks the groups in move, open, filter, tools order', () => {
    const grouped = groupedOf(bindingsAt({ kind: 'board', layout: 'kanban', offers: [] }));

    expect(grouped.map((held) => held.group)).toStrictEqual(['move', 'open', 'filter', 'tools']);
  });

  it('keeps each binding under its group, in structure order', () => {
    const grouped = groupedOf(bindingsAt({ kind: 'board', layout: 'kanban', offers: [] }));
    const open = grouped.find((held) => held.group === 'open');

    expect(open?.bindings.map((binding) => hintOf(binding))).toStrictEqual([
      '⏎ journey',
      'm map',
      'v list',
      'b backlog',
      'ctrl+p go',
      'q quit',
    ]);
  });

  it('drops a group nothing wears', () => {
    expect(groupedOf(bindingsAt({ kind: 'gate' })).map((held) => held.group)).toStrictEqual([
      'open',
      'tools',
    ]);
  });
});
