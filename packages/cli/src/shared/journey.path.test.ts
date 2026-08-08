import { describe, expect, it } from 'vitest';

import type { Journey } from './journey.ts';

import { foldJourney } from './journey.ts';

function itemOf(status: string, children: string[] = []): string {
  const closing =
    children.length === 0
      ? 'children: []'
      : ['children:', ...children.map((child) => `  - ${child}`)].join('\n');

  return `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\n${closing}\n`;
}

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function wrote(item: string, path: string, at: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'allowed', about: path, item, at })}\n`;
}

const WALKED =
  moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
  moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

function idsOf(journey: Journey | undefined): string[] {
  return journey?.nodes.map((node) => node.id) ?? [];
}

const MACHINE = [
  'triaged',
  'designing',
  'awaiting-approval',
  'implementing',
  'verifying',
  'awaiting-merge',
  'shipped',
];

describe('the machine path a journey draws', () => {
  it('draws every stage ahead of the item through to shipped', () => {
    const journey = foldJourney([{ key: 'K-1', contents: itemOf('designing') }], WALKED, 'K-1');

    expect(idsOf(journey)).toEqual([
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
      'shipped',
    ]);
  });

  it('marks a stage the item has not reached as unvisited', () => {
    const journey = foldJourney([{ key: 'K-1', contents: itemOf('designing') }], WALKED, 'K-1');
    const ahead = journey?.nodes.find((node) => node.id === 'implementing');

    expect(ahead?.state).toBe('future');
    expect(ahead?.at).toBeUndefined();
    expect(ahead?.until).toBeUndefined();
  });

  it('leaves the artifacts an item wrote off the canvas', () => {
    const wrote1 = wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z');
    const journey = foldJourney(
      [{ key: 'K-1', contents: itemOf('designing') }],
      WALKED + wrote1,
      'K-1',
    );

    expect(idsOf(journey)).toEqual(MACHINE);
    expect(journey?.artifacts.map((artifact) => artifact.path)).toEqual(['.ket/items/K-1/spec.md']);
  });

  it('leaves the children of an epic off the canvas', () => {
    const journey = foldJourney(
      [
        { key: 'K-1', contents: itemOf('designing', ['K-2']) },
        { key: 'K-2', contents: itemOf('triaged') },
      ],
      WALKED,
      'K-1',
    );

    expect(idsOf(journey)).toEqual(MACHINE);
    expect(journey?.children.map((child) => child.key)).toEqual(['K-2']);
  });
});
