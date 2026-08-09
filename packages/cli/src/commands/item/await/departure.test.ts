import { describe, expect, it } from 'vitest';

import type { LoggedEvent } from '../../../shared/log-lines.ts';

import { readEvents } from '../../../shared/log-lines.ts';
import { departureAmong } from './departure.ts';

function logged(events: object[]): LoggedEvent[] {
  return readEvents(events.map((event) => JSON.stringify(event)).join('\n'));
}

const moved = (item: string, about: string): object => ({
  gate: 'transition',
  outcome: 'allowed',
  about,
  item,
  at: '2026-08-09T10:00:00.000Z',
});

describe('picking the departure out of the logged events', () => {
  it('finds the transition that carried the item out of the status', () => {
    const events = logged([moved('K-1', 'implementing')]);

    expect(departureAmong(events, 'K-1', 'awaiting-approval')).toBe('implementing');
  });

  it('answers with the first departure when several follow', () => {
    const events = logged([moved('K-1', 'implementing'), moved('K-1', 'verifying')]);

    expect(departureAmong(events, 'K-1', 'awaiting-approval')).toBe('implementing');
  });

  it('passes over a transition that names no destination', () => {
    const nowhere = { gate: 'transition', outcome: 'allowed', item: 'K-1' };
    const events = logged([nowhere, moved('K-1', 'implementing')]);

    expect(departureAmong(events, 'K-1', 'awaiting-approval')).toBe('implementing');
  });

  it('passes over a transition about another item', () => {
    const events = logged([moved('K-2', 'implementing'), moved('K-1', 'verifying')]);

    expect(departureAmong(events, 'K-1', 'awaiting-approval')).toBe('verifying');
  });

  it('passes over a transition the store refused', () => {
    const refused = {
      gate: 'transition',
      outcome: 'refused',
      about: 'approve',
      item: 'K-1',
      reason: 'already implementing',
    };

    expect(departureAmong(logged([refused]), 'K-1', 'awaiting-approval')).toBeUndefined();
  });

  it('passes over notes and the decisions of other gates', () => {
    const noise = [
      { note: 'writing the failing test', actor: 'implementer', item: 'K-1' },
      { gate: 'write', outcome: 'allowed', about: 'src/auth.ts', item: 'K-1' },
    ];

    expect(departureAmong(logged(noise), 'K-1', 'awaiting-approval')).toBeUndefined();
  });

  it('passes over the arrival that put the item where it stands', () => {
    const events = logged([moved('K-1', 'awaiting-approval')]);

    expect(departureAmong(events, 'K-1', 'awaiting-approval')).toBeUndefined();
  });

  it('answers nothing while nothing moved', () => {
    expect(departureAmong([], 'K-1', 'awaiting-approval')).toBeUndefined();
  });
});
