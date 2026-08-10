import { describe, expect, it } from 'vitest';

import type { BindingSpot } from './bindings.ts';
import type { ShelfSpot } from './shelf.ts';

import { bindingsAt, groupedOf, hintOf } from './bindings.ts';

const BARE: ShelfSpot = { rows: 0, spare: 0, whole: false };

function groupAt(spot: BindingSpot, hint: string): string | undefined {
  return bindingsAt(spot).find((binding) => hintOf(binding) === hint)?.group;
}

describe('the group every binding wears', () => {
  it('files the walk under move and the dive under open', () => {
    const board: BindingSpot = {
      kind: 'board',
      layout: 'kanban',
      offers: ['approve'],
      holds: true,
      shelf: BARE,
    };

    expect(groupAt(board, '←↑↓→ move')).toBe('move');
    expect(groupAt(board, '⏎ journey')).toBe('open');
    expect(groupAt(board, 'q quit')).toBe('open');
  });

  it('files the gate keys and the refresh under tools', () => {
    const board: BindingSpot = {
      kind: 'board',
      layout: 'kanban',
      offers: ['approve'],
      holds: true,
      shelf: BARE,
    };

    expect(groupAt(board, 'a approve')).toBe('tools');
    expect(groupAt(board, 'r refresh')).toBe('tools');
  });

  it('files the slash under filter', () => {
    const board: BindingSpot = {
      kind: 'board',
      layout: 'kanban',
      offers: [],
      holds: true,
      shelf: BARE,
    };

    expect(groupAt(board, '/ filter')).toBe('filter');
  });

  it('files the palette under open, wherever it appears', () => {
    expect(
      groupAt(
        { kind: 'board', layout: 'kanban', offers: [], holds: true, shelf: BARE },
        'ctrl+p go',
      ),
    ).toBe('open');
    expect(groupAt({ kind: 'map', holds: true }, 'ctrl+p go')).toBe('open');
  });

  it('files the help key under tools, wherever it appears', () => {
    expect(
      groupAt({ kind: 'board', layout: 'kanban', offers: [], holds: true, shelf: BARE }, '? help'),
    ).toBe('tools');
    expect(groupAt({ kind: 'surface' }, '? help')).toBe('tools');
  });
});

describe('the grouping the help screen reads', () => {
  it('walks the groups in move, open, filter, tools order', () => {
    const grouped = groupedOf(
      bindingsAt({ kind: 'board', layout: 'kanban', offers: [], holds: true, shelf: BARE }),
    );

    expect(grouped.map((held) => held.group)).toStrictEqual(['move', 'open', 'filter', 'tools']);
  });

  it('keeps each binding under its group, in structure order', () => {
    const grouped = groupedOf(
      bindingsAt({ kind: 'board', layout: 'kanban', offers: [], holds: true, shelf: BARE }),
    );
    const open = grouped.find((held) => held.group === 'open');

    expect(open?.bindings.map((binding) => hintOf(binding))).toStrictEqual([
      '⏎ journey',
      'm map',
      'v list',
      'b backlog',
      'x archive',
      'l log',
      'd docs',
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

  it('drops the move group from the help of a board holding no card', () => {
    const grouped = groupedOf(
      bindingsAt({ kind: 'board', layout: 'kanban', offers: [], holds: false, shelf: BARE }),
    );

    expect(grouped.map((held) => held.group)).toStrictEqual(['open', 'tools']);
  });
});
