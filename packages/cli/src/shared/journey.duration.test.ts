import { describe, expect, it } from 'vitest';

import type { Journey } from './journey.ts';

import { foldJourney } from './journey.ts';

function itemOf(status: string): string {
  return `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\nchildren: []\n`;
}

function moved(to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item: 'K-1', at })}\n`;
}

const STORED = [{ key: 'K-1', contents: itemOf('designing') }];

const WALKED =
  moved('triaged', '2026-08-07T09:00:00.000Z') + moved('designing', '2026-08-07T10:00:00.000Z');

function stageIn(journey: Journey | undefined, id: string): Journey['nodes'][number] | undefined {
  return journey?.nodes.find((node) => node.id === id);
}

describe('how long a stage held the item', () => {
  it('closes a finished stage at the arrival that followed it', () => {
    const journey = foldJourney(STORED, WALKED, 'K-1');

    expect(stageIn(journey, 'triaged')?.until).toBe('2026-08-07T10:00:00.000Z');
  });

  it('leaves the stage the item stands in open', () => {
    const journey = foldJourney(STORED, WALKED, 'K-1');

    expect(stageIn(journey, 'designing')?.until).toBeUndefined();
  });

  it('closes each visit of a reopened stage at its own follower', () => {
    const looped =
      WALKED +
      moved('triaged', '2026-08-07T11:00:00.000Z') +
      moved('designing', '2026-08-07T11:30:00.000Z');
    const journey = foldJourney(STORED, looped, 'K-1');

    expect(stageIn(journey, 'designing')?.until).toBe('2026-08-07T11:00:00.000Z');
    expect(stageIn(journey, 'triaged#2')?.until).toBe('2026-08-07T11:30:00.000Z');
  });
});
