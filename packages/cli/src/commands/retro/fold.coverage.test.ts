import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

function moved(to: string, at: string): string {
  return `${JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: to,
    item: 'K-1',
    at,
  })}\n`;
}

function eventsIn(log: string): number {
  return foldRetro(WORKING, log, WINDOW).events;
}

describe('the coverage a retro reports', () => {
  it('counts the events the window carries', () => {
    const log =
      moved('triaged', '2026-08-04T09:00:00.000Z') + moved('designing', '2026-08-05T09:00:00.000Z');

    expect(eventsIn(log)).toBe(2);
  });

  it('carries the window it read, so a reader knows what the count covers', () => {
    expect(foldRetro(WORKING, '', WINDOW).window).toStrictEqual(WINDOW);
  });

  it('counts nothing in a window no event landed in', () => {
    expect(eventsIn('')).toBe(0);
  });
});

describe('the edges of a window', () => {
  it('counts an event landing exactly as the window opens', () => {
    expect(eventsIn(moved('designing', '2026-08-03T00:00:00.000Z'))).toBe(1);
  });

  it('counts an event landing exactly as the window closes', () => {
    expect(eventsIn(moved('designing', '2026-08-08T12:00:00.000Z'))).toBe(1);
  });

  it('leaves out an event landing a moment before the window opened', () => {
    expect(eventsIn(moved('designing', '2026-08-02T23:59:59.999Z'))).toBe(0);
  });

  it('leaves out an event landing a moment after the window closed', () => {
    expect(eventsIn(moved('designing', '2026-08-08T12:00:00.001Z'))).toBe(0);
  });
});

describe('the lines a real log carries', () => {
  it('reads past a line no reader can parse', () => {
    const log = `not json at all\n${moved('triaged', '2026-08-04T09:00:00.000Z')}`;

    expect(eventsIn(log)).toBe(1);
  });

  it('reads past a line holding a value that is no event at all', () => {
    const log = `42\n${moved('triaged', '2026-08-04T09:00:00.000Z')}`;

    expect(eventsIn(log)).toBe(1);
  });

  it('reads past an event carrying no moment, since nothing can place it', () => {
    const undated = `${JSON.stringify({ gate: 'write', outcome: 'refused', item: 'K-1' })}\n`;

    expect(eventsIn(moved('triaged', '2026-08-04T09:00:00.000Z') + undated)).toBe(1);
  });

  it('reads past an event whose moment no calendar can read', () => {
    const vague = `${JSON.stringify({ gate: 'write', outcome: 'refused', at: 'last tuesday' })}\n`;

    expect(eventsIn(moved('triaged', '2026-08-04T09:00:00.000Z') + vague)).toBe(1);
  });

  it('reads a log whose events arrived out of order', () => {
    const log =
      moved('designing', '2026-08-05T09:00:00.000Z') + moved('triaged', '2026-08-04T09:00:00.000Z');

    expect(foldRetro(WORKING, log, WINDOW).unmoved).toStrictEqual([]);
  });
});
