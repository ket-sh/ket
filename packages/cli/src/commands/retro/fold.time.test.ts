import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const HOUR = 3_600_000;

function stored(size: string, status: string) {
  return [
    { key: 'K-1', contents: `title: The fold\nkind: feature\nsize: ${size}\nstatus: ${status}\n` },
  ];
}

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function turnedAway(at: string, item = 'K-1'): string {
  return `${JSON.stringify({
    gate: 'write',
    outcome: 'refused',
    about: 'src/a.ts',
    item,
    at,
    reason: 'the test comes first',
  })}\n`;
}

const WORKING = stored('story', 'implementing');

const NEIGHBOR = {
  key: 'K-2',
  contents: 'title: A quiet fix\nkind: bug\nsize: subtask\nstatus: implementing\n',
};

describe('the longest stall', () => {
  it('names the longest quiet on an item, with the stage it sat at', () => {
    const log =
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T10:00:00.000Z') +
      turnedAway('2026-08-04T13:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall).toStrictEqual({
      key: 'K-1',
      stage: 'implementing',
      span: 3 * HOUR,
    });
  });

  it('measures a stall on a log whose events arrived out of order', () => {
    const log = turnedAway('2026-08-04T13:00:00.000Z') + turnedAway('2026-08-04T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall?.span).toBe(4 * HOUR);
  });

  it('measures each item on its own events, never on a neighbor between them', () => {
    const shelf = [...WORKING, NEIGHBOR];
    const log =
      turnedAway('2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T10:00:00.000Z', 'K-2') +
      turnedAway('2026-08-04T12:00:00.000Z') +
      turnedAway('2026-08-04T12:30:00.000Z', 'K-2');

    expect(foldRetro(shelf, log, WINDOW).stall).toStrictEqual({
      key: 'K-1',
      stage: 'implementing',
      span: 3 * HOUR,
    });
  });

  it('reads no stall off an item that has already shipped', () => {
    const log = turnedAway('2026-08-04T09:00:00.000Z') + turnedAway('2026-08-04T11:00:00.000Z');

    expect(foldRetro(stored('story', 'shipped'), log, WINDOW).stall).toBeUndefined();
  });

  it('reads no stall from a single event, since one moment leaves no gap', () => {
    expect(
      foldRetro(WORKING, turnedAway('2026-08-04T09:00:00.000Z'), WINDOW).stall,
    ).toBeUndefined();
  });

  it('reads no stall from events outside the window', () => {
    const log = turnedAway('2026-07-01T09:00:00.000Z') + turnedAway('2026-07-02T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall).toBeUndefined();
  });
});

describe('the stage a stall sat at', () => {
  it('names the stage the item had just reached when the quiet began', () => {
    const log =
      turnedAway('2026-08-04T09:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-04T10:00:00.000Z') +
      turnedAway('2026-08-04T13:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall?.stage).toBe('verifying');
  });

  it('names the stage the item held then, never the one it reached later', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-04T08:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-04T08:30:00.000Z') +
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T13:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-04T13:30:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall?.stage).toBe('implementing');
  });

  it('reads the stage from the store when no move in the log placed the item', () => {
    const log = turnedAway('2026-08-04T09:00:00.000Z') + turnedAway('2026-08-04T11:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).stall?.stage).toBe('implementing');
  });
});

describe('the rework a window shows', () => {
  it('counts a move that sends an item back down the pipeline', () => {
    const log =
      moved('K-1', 'verifying', '2026-08-04T09:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-05T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([{ key: 'K-1', count: 1 }]);
  });

  it('counts no rework for an item that only moved forward', () => {
    const log =
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-05T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([]);
  });

  it('reads the stage held before the window when judging a move inside it', () => {
    const log =
      moved('K-1', 'verifying', '2026-07-30T09:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([{ key: 'K-1', count: 1 }]);
  });

  it('counts no rework for a backward move that landed before the window', () => {
    const log =
      moved('K-1', 'verifying', '2026-07-29T09:00:00.000Z') +
      moved('K-1', 'implementing', '2026-07-30T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([]);
  });

  it('counts no rework from a refusal naming a stage, since a refusal moves nothing', () => {
    const refusedBack = `${JSON.stringify({
      gate: 'transition',
      outcome: 'refused',
      about: 'implementing',
      item: 'K-1',
      at: '2026-08-05T09:00:00.000Z',
    })}\n`;
    const log = moved('K-1', 'verifying', '2026-08-04T09:00:00.000Z') + refusedBack;

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([]);
  });

  it('counts no rework for a move that landed on the stage the item already held', () => {
    const log =
      moved('K-1', 'verifying', '2026-08-04T09:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-05T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([]);
  });

  it('counts no rework for a move toward a stage the pipeline never named', () => {
    const log =
      moved('K-1', 'verifying', '2026-08-04T09:00:00.000Z') +
      moved('K-1', 'somewhere-else', '2026-08-05T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).rework).toStrictEqual([]);
  });
});

describe('where the time went', () => {
  function splitOf(items: ReturnType<typeof stored>, log: string): number[] {
    const retro = foldRetro(items, log, WINDOW);

    return [retro.waiting, retro.working];
  }

  it('counts quiet at a stage waiting on a person as waiting', () => {
    const log =
      moved('K-1', 'awaiting-approval', '2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf(stored('story', 'awaiting-approval'), log)).toStrictEqual([2 * HOUR, 0]);
  });

  it('counts quiet at a stage the machine drives as work', () => {
    const log =
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf(WORKING, log)).toStrictEqual([0, 2 * HOUR]);
  });

  it('counts quiet after an item shipped as neither, since nothing was owed', () => {
    const log =
      moved('K-1', 'shipped', '2026-08-04T09:00:00.000Z') + turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf(stored('story', 'shipped'), log)).toStrictEqual([0, 0]);
  });

  it('reads the size the store holds, since a stage waits on a person by size', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-04T09:00:00.000Z') + turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf(stored('subtask', 'triaged'), log)).toStrictEqual([2 * HOUR, 0]);
  });

  it('reads a triaged story as work the machine owes, since design comes next', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-04T09:00:00.000Z') + turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf(stored('story', 'triaged'), log)).toStrictEqual([0, 2 * HOUR]);
  });

  it('counts nothing for an item the store no longer holds', () => {
    const log =
      moved('K-1', 'implementing', '2026-08-04T09:00:00.000Z') +
      turnedAway('2026-08-04T11:00:00.000Z');

    expect(splitOf([], log)).toStrictEqual([0, 0]);
  });
});
