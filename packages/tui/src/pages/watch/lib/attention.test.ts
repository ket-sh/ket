import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { KANAGAWA } from '../../../shared/theme';
import { accentOf, bellsAmong, needsYou, waitsOnAHuman } from './attention.ts';

function cardOf(patch: Partial<KanbanCardView> = {}): KanbanCardView {
  return {
    key: 'K-1',
    title: 'The watched item',
    size: 'story',
    status: 'designing',
    parent: undefined,
    since: undefined,
    refusal: undefined,
    offers: [],
    ...patch,
  };
}

function boardOf(cards: KanbanCardView[]): KanbanColumnView[] {
  return [{ status: 'the lane they sit in', cards }];
}

describe('the statuses where the pipeline waits on a human', () => {
  it('waits at the approval gate', () => {
    expect(waitsOnAHuman('awaiting-approval')).toBe(true);
  });

  it('waits at the merge gate', () => {
    expect(waitsOnAHuman('awaiting-merge')).toBe(true);
  });

  it('leaves the machine stages to the machine', () => {
    for (const status of ['idea', 'triaged', 'designing', 'implementing', 'verifying', 'shipped']) {
      expect(waitsOnAHuman(status)).toBe(false);
    }
  });
});

describe('the cards that need the viewer', () => {
  it('needs them where the item waits at a human gate', () => {
    expect(needsYou(cardOf({ status: 'awaiting-approval' }))).toBe(true);
    expect(needsYou(cardOf({ status: 'awaiting-merge' }))).toBe(true);
  });

  it('needs them while a refusal stands open', () => {
    const refused = cardOf({
      refusal: { reason: 'no spec named', at: '2026-08-07T11:00:00.000Z', gate: 'write' },
    });

    expect(needsYou(refused)).toBe(true);
  });

  it('leaves a card the machine still owns alone', () => {
    expect(needsYou(cardOf())).toBe(false);
    expect(needsYou(cardOf({ status: 'triaged' }))).toBe(false);
  });
});

describe('the accent a waiting card wears', () => {
  it('borders a needs-you card in amber', () => {
    expect(accentOf(cardOf({ status: 'awaiting-merge' }), KANAGAWA)).toBe(KANAGAWA.yellow);
  });

  it('leaves a quiet card to the frame it already wears', () => {
    expect(accentOf(cardOf(), KANAGAWA)).toBeUndefined();
  });
});

describe('the bells a board snapshot rings', () => {
  it('rings for an item standing at a human gate, naming the item and the gate', () => {
    const bells = bellsAmong(boardOf([cardOf({ status: 'awaiting-approval' })]));

    expect(bells).toHaveLength(1);
    expect(bells[0]?.message).toBe('K-1 needs you · awaiting-approval');
  });

  it('says sent back when the transition gate refused', () => {
    const bells = bellsAmong(
      boardOf([
        cardOf({
          since: '2026-08-07T10:00:00.000Z',
          refusal: {
            reason: 'one job means one branch',
            at: '2026-08-07T11:00:00.000Z',
            gate: 'transition',
          },
        }),
      ]),
    );

    expect(bells[0]?.message).toBe('K-1 sent back · one job means one branch');
  });

  it('says changes requested when a work gate refused', () => {
    const bells = bellsAmong(
      boardOf([
        cardOf({
          since: '2026-08-07T10:00:00.000Z',
          refusal: {
            reason: 'no failing test covers it',
            at: '2026-08-07T11:00:00.000Z',
            gate: 'write',
          },
        }),
      ]),
    );

    expect(bells[0]?.message).toBe('K-1 changes requested · no failing test covers it');
  });

  it('stays silent for the cards the machine still owns', () => {
    expect(bellsAmong(boardOf([cardOf(), cardOf({ key: 'K-2', status: 'triaged' })]))).toEqual([]);
  });
});

describe('the signature that keeps a bell from ringing twice', () => {
  it('rings a later visit to the same gate as its own arrival', () => {
    const first = bellsAmong(
      boardOf([cardOf({ status: 'awaiting-approval', since: '2026-08-07T10:00:00.000Z' })]),
    );
    const second = bellsAmong(
      boardOf([cardOf({ status: 'awaiting-approval', since: '2026-08-07T12:00:00.000Z' })]),
    );

    expect(first[0]?.signature).not.toBe(second[0]?.signature);
  });

  it('rings the gate and the standing refusal apart', () => {
    const bells = bellsAmong(
      boardOf([
        cardOf({
          status: 'awaiting-merge',
          since: '2026-08-07T10:00:00.000Z',
          refusal: {
            reason: 'the branch fell behind',
            at: '2026-08-07T11:00:00.000Z',
            gate: 'shell',
          },
        }),
      ]),
    );

    expect(bells).toHaveLength(2);
    expect(new Set(bells.map((bell) => bell.signature)).size).toBe(2);
  });
});
