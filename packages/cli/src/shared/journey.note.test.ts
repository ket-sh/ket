import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

const STORED = [
  {
    key: 'K-1',
    contents:
      'title: The watched item\nkind: feature\nsize: story\nstatus: designing\nchildren: []\n',
  },
];

function moved(to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item: 'K-1', at })}\n`;
}

function said(text: string, at: string): string {
  return `${JSON.stringify({ note: text, actor: 'decomposer', item: 'K-1', at })}\n`;
}

const WALKED =
  moved('triaged', '2026-08-07T08:00:00.000Z') + moved('designing', '2026-08-07T10:00:00.000Z');

function journeyOf(log: string) {
  const journey = foldJourney(STORED, log, 'K-1');

  if (journey === undefined) {
    throw new Error('the fixture journey never folded');
  }

  return journey;
}

describe('the narration the standing stage speaks', () => {
  it('hangs the latest note on the stage the item stands in', () => {
    const journey = journeyOf(
      WALKED + said('researching the breakdown', '2026-08-07T11:00:00.000Z'),
    );

    expect(journey.nodes.find((node) => node.id === 'designing')?.note).toStrictEqual({
      text: 'researching the breakdown',
      actor: 'decomposer',
      at: '2026-08-07T11:00:00.000Z',
    });
  });

  it('leaves the settled and the pending stages without narration', () => {
    const journey = journeyOf(
      WALKED + said('researching the breakdown', '2026-08-07T11:00:00.000Z'),
    );
    const others = journey.nodes.filter((node) => node.id !== 'designing');

    expect(others.length).toBeGreaterThan(0);
    expect(others.every((node) => node.note === undefined)).toBe(true);
  });

  it('opens each stage on a clean slate, deaf to the words of the stage before', () => {
    const journey = journeyOf(
      said('a word said while triaged', '2026-08-07T09:00:00.000Z') + WALKED,
    );

    expect(journey.nodes.find((node) => node.id === 'designing')?.note).toBeUndefined();
  });
});

describe('the narration the item pane carries', () => {
  it('hands the pane the same note with its author', () => {
    const journey = journeyOf(
      WALKED + said('researching the breakdown', '2026-08-07T11:00:00.000Z'),
    );

    expect(journey.pane.note).toStrictEqual({
      text: 'researching the breakdown',
      actor: 'decomposer',
      at: '2026-08-07T11:00:00.000Z',
    });
  });

  it('leaves the pane quiet when no step said anything', () => {
    expect(journeyOf(WALKED).pane.note).toBeUndefined();
  });
});
