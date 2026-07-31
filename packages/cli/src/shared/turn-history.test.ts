import { describe, expect, it } from 'vitest';

import type { GateEvent } from './event.ts';

import { renderEvent } from './event.ts';
import { turnHistoryIn } from './turn-history.ts';

const STANDING = 'OS-1 implementing';

function logOf(events: GateEvent[]): string {
  return events.map(renderEvent).join('');
}

function turned(outcome: GateEvent['outcome'], about: string, reason?: string): GateEvent {
  return {
    gate: 'turn',
    outcome,
    about,
    item: 'OS-1',
    ...(reason === undefined ? {} : { reason }),
  };
}

describe('how often ket has already refused this stop', () => {
  it('counts nothing where no gate has decided anything yet', () => {
    expect(turnHistoryIn('', STANDING)).toStrictEqual({ refusals: 0, rested: false });
  });

  it('counts each refusal it recorded at this stage', () => {
    const log = logOf([turned('refused', STANDING), turned('refused', STANDING)]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(2);
  });

  it('counts nothing at a stage the item has only just reached', () => {
    const log = logOf([turned('refused', 'OS-1 designing'), turned('refused', 'OS-1 designing')]);

    expect(turnHistoryIn(log, 'OS-1 implementing').refusals).toBe(0);
  });

  it('counts nothing for another item, since a key is not a standing', () => {
    const log = logOf([turned('refused', 'OS-2 implementing')]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(0);
  });

  it('starts counting again from the last time ket let go', () => {
    const log = logOf([
      turned('refused', STANDING),
      turned('refused', STANDING),
      turned('allowed', STANDING, 'ket refused this stop twice'),
      turned('refused', STANDING),
    ]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(1);
  });

  it('reads past what other gates recorded in between', () => {
    const log = logOf([
      turned('refused', STANDING),
      { gate: 'write', outcome: 'allowed', about: 'src/auth.ts' },
      turned('refused', STANDING),
    ]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(2);
  });

  it('reads a refusal carrying a reason, since every refusal carries one', () => {
    const log = logOf([
      turned('refused', STANDING, 'OS-1 is implementing, not at a stopping place'),
    ]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(1);
  });
});

describe('whether a person has already said to stop here', () => {
  it('finds no rest where nobody recorded one', () => {
    const log = logOf([turned('refused', STANDING)]);

    expect(turnHistoryIn(log, STANDING).rested).toBe(false);
  });

  it('finds the rest a person recorded at this stage', () => {
    const log = logOf([turned('skipped', STANDING, 'waiting on the customer')]);

    expect(turnHistoryIn(log, STANDING).rested).toBe(true);
  });

  it('finds no rest recorded at a stage the item has since left', () => {
    const log = logOf([turned('skipped', 'OS-1 designing', 'waiting on the customer')]);

    expect(turnHistoryIn(log, STANDING).rested).toBe(false);
  });

  it('holds the rest after ket has let go once, since the person still means it', () => {
    const log = logOf([
      turned('skipped', STANDING, 'waiting on the customer'),
      turned('allowed', STANDING, 'a person recorded a deliberate stop'),
    ]);

    expect(turnHistoryIn(log, STANDING).rested).toBe(true);
  });

  it('leaves the count alone, since a rest is not a refusal', () => {
    const log = logOf([turned('skipped', STANDING, 'waiting on the customer')]);

    expect(turnHistoryIn(log, STANDING).refusals).toBe(0);
  });
});

describe('a rest that is the last thing the gate let go on', () => {
  it('counts only the refusals since that rest, not the ones before it', () => {
    const log = logOf([
      turned('refused', STANDING),
      turned('refused', STANDING),
      turned('skipped', STANDING, 'end of the day'),
      turned('refused', STANDING),
    ]);

    expect(turnHistoryIn(log, STANDING)).toStrictEqual({ refusals: 1, rested: true });
  });
});
