import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { archiveOf, cappedShipped, SHIPPED_SHOWN } from './shipped.ts';

function cardOf(key: string, since: string | undefined): KanbanCardView {
  return {
    key,
    title: `The work behind ${key}`,
    size: 'story',
    status: 'shipped',
    kind: 'feature',
    parent: undefined,
    since,
    refusal: undefined,
    note: undefined,
    offers: [],
  };
}

function shippedLane(cards: KanbanCardView[]): KanbanColumnView[] {
  return [
    { status: 'designing', cards: [{ ...cardOf('K-0', undefined), status: 'designing' }] },
    { status: 'shipped', cards },
  ];
}

function seven(): KanbanCardView[] {
  return Array.from({ length: 7 }, (_, held) =>
    cardOf(`K-${String(held + 10)}`, `2026-08-0${String(held + 1)}T12:00:00.000Z`),
  );
}

describe('the cap the shipped lane wears', () => {
  it('keeps only the newest five where more have shipped', () => {
    const capped = cappedShipped(shippedLane(seven()));
    const lane = capped.find((column) => column.status === 'shipped');

    expect(lane?.cards.map((card) => card.key)).toStrictEqual([
      'K-16',
      'K-15',
      'K-14',
      'K-13',
      'K-12',
    ]);
    expect(SHIPPED_SHOWN).toBe(5);
  });

  it('leaves a lane of five or fewer whole and in its own order', () => {
    const held = seven().slice(0, 3);
    const capped = cappedShipped(shippedLane(held));

    expect(capped.find((column) => column.status === 'shipped')?.cards).toStrictEqual(held);
  });

  it('leaves every other lane untouched', () => {
    const capped = cappedShipped(shippedLane(seven()));

    expect(capped.find((column) => column.status === 'designing')?.cards).toHaveLength(1);
  });

  it('seats a shipped card the log never dated behind the dated ones', () => {
    const undated = [cardOf('K-30', undefined), ...seven().slice(0, 5)];
    const capped = cappedShipped(shippedLane(undated));

    expect(
      capped.find((column) => column.status === 'shipped')?.cards.map((card) => card.key),
    ).not.toContain('K-30');
  });
});

describe('the archive the shipped work rests in', () => {
  it('lists every shipped card, the newest first', () => {
    expect(archiveOf(shippedLane(seven())).map((card) => card.key)).toStrictEqual([
      'K-16',
      'K-15',
      'K-14',
      'K-13',
      'K-12',
      'K-11',
      'K-10',
    ]);
  });

  it('lists nothing where nothing has shipped', () => {
    expect(archiveOf(shippedLane([]))).toStrictEqual([]);
  });
});
