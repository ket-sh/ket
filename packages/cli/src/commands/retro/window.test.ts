import { describe, expect, it } from 'vitest';

import { momentOf, retroPathOf, windowFrom } from './window.ts';

const SATURDAY = '2026-08-08T12:00:00.000Z';

function windowOf(reportedAt: string, since?: string) {
  const chosen = windowFrom(reportedAt, since);

  if ('refused' in chosen) {
    throw new Error(chosen.refused);
  }

  return chosen.window;
}

function asText(at: number): string {
  return new Date(at).toISOString();
}

describe('the window a retro reads', () => {
  it('opens on the Monday of the week the report is written in', () => {
    expect(asText(windowOf(SATURDAY).from)).toBe('2026-08-03T00:00:00.000Z');
  });

  it('closes at the moment the report is written', () => {
    expect(asText(windowOf(SATURDAY).to)).toBe(SATURDAY);
  });

  it('opens where a given moment says, rather than at the week', () => {
    expect(asText(windowOf(SATURDAY, '2026-07-01T09:30:00.000Z').from)).toBe(
      '2026-07-01T09:30:00.000Z',
    );
  });

  it('still closes at the report moment when a start is given', () => {
    expect(asText(windowOf(SATURDAY, '2026-07-01T09:30:00.000Z').to)).toBe(SATURDAY);
  });

  it('refuses a start no calendar can read, naming what it was handed', () => {
    expect(windowFrom(SATURDAY, 'last tuesday-ish')).toStrictEqual({
      refused: 'last tuesday-ish is not a moment this report can read',
    });
  });
});

describe('where a retro is filed', () => {
  it('files the report under the week the report closes in', () => {
    expect(retroPathOf(windowOf(SATURDAY))).toBe('docs/retro/2026-W32.md');
  });

  it('pads a single digit week, so the files sort as the year runs', () => {
    expect(retroPathOf(windowOf('2026-01-05T00:00:00.000Z'))).toBe('docs/retro/2026-W02.md');
  });

  it('files a late December day under the week year that owns it', () => {
    expect(retroPathOf(windowOf('2025-12-29T00:00:00.000Z'))).toBe('docs/retro/2026-W01.md');
  });

  it('files an early January day under the year whose week still runs', () => {
    expect(retroPathOf(windowOf('2027-01-01T00:00:00.000Z'))).toBe('docs/retro/2026-W53.md');
  });

  it('files the last day of a week year under that year, not the next', () => {
    expect(retroPathOf(windowOf('2026-01-04T23:59:59.999Z'))).toBe('docs/retro/2026-W01.md');
  });
});

describe('reading a moment off an event', () => {
  it('reads an instant the log wrote', () => {
    expect(momentOf('2026-08-08T12:00:00.000Z')).toBe(Date.parse('2026-08-08T12:00:00.000Z'));
  });

  it('reads nothing off a line that carries no calendar moment', () => {
    expect(momentOf('some time last week')).toBeUndefined();
  });
});
