import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

function stored(key: string, title: string, size: string, status: string) {
  return { key, contents: `title: ${title}\nkind: feature\nsize: ${size}\nstatus: ${status}\n` };
}

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function refusedMove(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'refused', about: to, item, at })}\n`;
}

const WORKING = [stored('K-1', 'The fold', 'story', 'implementing')];

const FILED = moved('K-1', 'triaged', '2026-08-04T09:00:00.000Z');

const CLOSES = Date.parse('2026-08-08T12:00:00.000Z');

describe('the items a week took in', () => {
  it('counts an item filed inside the window as one that entered', () => {
    expect(foldRetro(WORKING, FILED, WINDOW).entered).toStrictEqual([
      { key: 'K-1', title: 'The fold', size: 'story' },
    ]);
  });

  it('leaves out an item filed before the window opened', () => {
    const before = moved('K-1', 'triaged', '2026-07-20T09:00:00.000Z');

    expect(foldRetro(WORKING, before, WINDOW).entered).toStrictEqual([]);
  });

  it('reads an arrival at triaged as the filing, and a later stage as neither', () => {
    const log = moved('K-1', 'designing', '2026-08-04T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).entered).toStrictEqual([]);
  });

  it('names an entered item the store no longer holds by its key alone', () => {
    const filed = moved('GONE-9', 'triaged', '2026-08-04T09:00:00.000Z');

    expect(foldRetro([], filed, WINDOW).entered).toStrictEqual([
      { key: 'GONE-9', title: undefined, size: undefined },
    ]);
  });

  it('reads each entered item its own title, never the first the store holds', () => {
    const shelf = [stored('K-2', 'A quiet fix', 'subtask', 'triaged'), ...WORKING];

    expect(foldRetro(shelf, FILED, WINDOW).entered).toStrictEqual([
      { key: 'K-1', title: 'The fold', size: 'story' },
    ]);
  });

  it('counts no entry from a gate that allowed something else about a filing', () => {
    const allowed = `${JSON.stringify({
      gate: 'review',
      outcome: 'allowed',
      about: 'triaged',
      item: 'K-1',
      at: '2026-08-04T09:00:00.000Z',
    })}\n`;

    expect(foldRetro(WORKING, allowed, WINDOW).entered).toStrictEqual([]);
  });
});

describe('the items a week let go', () => {
  const SETTLED = [stored('K-2', 'A quiet fix', 'subtask', 'shipped')];

  it('counts an item that reached shipped inside the window', () => {
    const log = moved('K-2', 'shipped', '2026-08-06T15:00:00.000Z');

    expect(foldRetro(SETTLED, log, WINDOW).shipped).toStrictEqual([
      { key: 'K-2', title: 'A quiet fix', size: 'subtask' },
    ]);
  });

  it('counts nothing as shipped when the gate refused the move', () => {
    const log = refusedMove('K-2', 'shipped', '2026-08-06T15:00:00.000Z');

    expect(foldRetro(SETTLED, log, WINDOW).shipped).toStrictEqual([]);
  });
});

describe('the items still in flight', () => {
  it('ages an item still in flight from the day it was filed', () => {
    expect(foldRetro(WORKING, FILED, WINDOW).inFlight).toStrictEqual([
      {
        key: 'K-1',
        title: 'The fold',
        size: 'story',
        status: 'implementing',
        age: CLOSES - Date.parse('2026-08-04T09:00:00.000Z'),
      },
    ]);
  });

  it('ages an item from the move the log opened with, never a later return', () => {
    const log = FILED + moved('K-1', 'triaged', '2026-08-06T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).inFlight[0]?.age).toBe(
      CLOSES - Date.parse('2026-08-04T09:00:00.000Z'),
    );
  });

  it('ages an item from its own opening, never a neighbor filed before it', () => {
    const log =
      moved('K-2', 'triaged', '2026-08-04T08:00:00.000Z') +
      refusedMove('K-1', 'designing', '2026-08-04T08:30:00.000Z') +
      FILED +
      moved('K-1', 'designing', '2026-08-04T10:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).inFlight[0]?.age).toBe(
      CLOSES - Date.parse('2026-08-04T09:00:00.000Z'),
    );
  });

  it('ages an item from the first move the log remembers, filing or not', () => {
    const log = moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).inFlight[0]?.age).toBe(
      CLOSES - Date.parse('2026-08-04T09:00:00.000Z'),
    );
  });

  it('carries no age for an in-flight item the log never saw move', () => {
    expect(foldRetro(WORKING, '', WINDOW).inFlight[0]?.age).toBeUndefined();
  });

  it('leaves an item that has shipped out of the flight list', () => {
    const settled = [stored('K-2', 'A quiet fix', 'subtask', 'shipped')];

    expect(foldRetro(settled, '', WINDOW).inFlight).toStrictEqual([]);
  });

  it('leaves an item the store cannot read out of the flight list', () => {
    const unreadable = [{ key: 'K-9', contents: 'not yaml at all' }];

    expect(foldRetro(unreadable, '', WINDOW).inFlight).toStrictEqual([]);
  });
});

describe('items that entered and never moved', () => {
  function keysUnmoved(log: string): string[] {
    return foldRetro(WORKING, log, WINDOW).unmoved.map((line) => line.key);
  }

  it('names an item filed in the window that nothing moved after', () => {
    expect(foldRetro(WORKING, FILED, WINDOW).unmoved).toStrictEqual([
      { key: 'K-1', title: 'The fold', size: 'story' },
    ]);
  });

  it('leaves out an item a later move carried on', () => {
    expect(
      keysUnmoved(FILED + moved('K-1', 'designing', '2026-08-05T09:00:00.000Z')),
    ).toStrictEqual([]);
  });

  it('leaves out an item whose move landed the instant after it was filed', () => {
    expect(
      keysUnmoved(FILED + moved('K-1', 'designing', '2026-08-04T09:00:00.001Z')),
    ).toStrictEqual([]);
  });

  it('holds an item a gate only refused, since a refusal moves nothing', () => {
    expect(
      keysUnmoved(FILED + refusedMove('K-1', 'designing', '2026-08-05T09:00:00.000Z')),
    ).toStrictEqual(['K-1']);
  });

  it('holds an item whose neighbor moved instead', () => {
    expect(
      keysUnmoved(FILED + moved('K-2', 'designing', '2026-08-05T09:00:00.000Z')),
    ).toStrictEqual(['K-1']);
  });
});
