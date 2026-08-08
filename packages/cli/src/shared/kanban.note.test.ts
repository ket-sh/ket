import { describe, expect, it } from 'vitest';

import { foldKanban } from './kanban.ts';

const STORED = [
  {
    key: 'K-1',
    contents: 'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  },
];

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function said(item: string, text: string, over: object = {}): string {
  return `${JSON.stringify({ note: text, actor: 'decomposer', item, at: '2026-08-07T11:00:00.000Z', ...over })}\n`;
}

const ARRIVED = moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

function cardOf(log: string) {
  return foldKanban(STORED, log)
    .flatMap((column) => column.cards)
    .find((card) => card.key === 'K-1');
}

describe('the note a card carries from the step at work', () => {
  it('carries the note a step left since the card arrived, with its author and moment', () => {
    const log = ARRIVED + said('K-1', 'researching the breakdown');

    expect(cardOf(log)?.note).toStrictEqual({
      text: 'researching the breakdown',
      actor: 'decomposer',
      at: '2026-08-07T11:00:00.000Z',
    });
  });

  it('keeps only the freshest word when several notes landed', () => {
    const log =
      ARRIVED +
      said('K-1', 'reading the prior art', { at: '2026-08-07T10:30:00.000Z' }) +
      said('K-1', 'drafting the candidates', { at: '2026-08-07T11:30:00.000Z' });

    expect(cardOf(log)?.note?.text).toBe('drafting the candidates');
  });

  it('drops the narration of a stage the card already left', () => {
    const log = said('K-1', 'a word from last stage', { at: '2026-08-07T09:00:00.000Z' }) + ARRIVED;

    expect(cardOf(log)?.note).toBeUndefined();
  });

  it('leaves a card nobody narrated without a note', () => {
    expect(cardOf(ARRIVED)?.note).toBeUndefined();
  });

  it('counts a note landing the instant the card arrived', () => {
    const log = ARRIVED + said('K-1', 'starting the design', { at: '2026-08-07T10:00:00.000Z' });

    expect(cardOf(log)?.note?.text).toBe('starting the design');
  });

  it('reads only the notes of the card itself, never a neighbor', () => {
    const log = ARRIVED + said('GONE-1', 'someone else at work');

    expect(cardOf(log)?.note).toBeUndefined();
  });

  it('drops a note that lost its moment or its author', () => {
    const unplaced = `${JSON.stringify({ note: 'when?', actor: 'decomposer', item: 'K-1' })}\n`;
    const unsigned = `${JSON.stringify({ note: 'who?', item: 'K-1', at: '2026-08-07T11:00:00.000Z' })}\n`;

    expect(cardOf(ARRIVED + unplaced)?.note).toBeUndefined();
    expect(cardOf(ARRIVED + unsigned)?.note).toBeUndefined();
  });
});
