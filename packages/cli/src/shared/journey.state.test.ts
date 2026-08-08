import { describe, expect, it } from 'vitest';

import type { Journey } from './journey.ts';

import { foldJourney } from './journey.ts';

function itemOf(status: string): string {
  return `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\nchildren: []\n`;
}

function moved(to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item: 'K-1', at })}\n`;
}

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate, outcome: 'refused', about: 'src/auth.ts', item: 'K-1', at, reason })}\n`;
}

function storedAt(status: string): { key: string; contents: string }[] {
  return [{ key: 'K-1', contents: itemOf(status) }];
}

function stateIn(journey: Journey | undefined, id: string): string | undefined {
  return journey?.nodes.find((node) => node.id === id)?.state;
}

const WALKED =
  moved('triaged', '2026-08-07T09:00:00.000Z') + moved('designing', '2026-08-07T10:00:00.000Z');

describe('the state a stage wears', () => {
  it('finishes a stage the item already walked past', () => {
    expect(stateIn(foldJourney(storedAt('designing'), WALKED, 'K-1'), 'triaged')).toBe('done');
  });

  it('runs the stage the machine is working in', () => {
    expect(stateIn(foldJourney(storedAt('designing'), WALKED, 'K-1'), 'designing')).toBe('running');
  });

  it('leaves a stage the item never reached not started', () => {
    expect(stateIn(foldJourney(storedAt('designing'), WALKED, 'K-1'), 'implementing')).toBe(
      'future',
    );
  });
});

describe('the state a human gate wears', () => {
  it('asks the viewer to act where the gate stands open to them', () => {
    const log = WALKED + moved('awaiting-approval', '2026-08-07T11:00:00.000Z');

    expect(
      stateIn(foldJourney(storedAt('awaiting-approval'), log, 'K-1'), 'awaiting-approval'),
    ).toBe('needs-you');
  });

  it('waits quietly where the item stands before no gate the viewer can pass', () => {
    const log = WALKED + moved('shipped', '2026-08-07T11:00:00.000Z');

    expect(stateIn(foldJourney(storedAt('shipped'), log, 'K-1'), 'shipped')).toBe('done');
  });
});

describe('the state a refusal wears', () => {
  it('asks for changes where a machine gate turned the work away', () => {
    const log =
      WALKED + turnedAway('write', '2026-08-07T10:30:00.000Z', 'no failing test covers it');

    expect(stateIn(foldJourney(storedAt('designing'), log, 'K-1'), 'designing')).toBe(
      'changes-requested',
    );
  });

  it('sends the work back where the transition gate refused the move itself', () => {
    const log = WALKED + turnedAway('transition', '2026-08-07T10:30:00.000Z', 'not designed yet');

    expect(stateIn(foldJourney(storedAt('designing'), log, 'K-1'), 'designing')).toBe('sent-back');
  });

  it('carries the refusal reason and moment on the stage that wears it', () => {
    const log =
      WALKED + turnedAway('write', '2026-08-07T10:30:00.000Z', 'no failing test covers it');
    const stage = foldJourney(storedAt('designing'), log, 'K-1')?.nodes.find(
      (node) => node.id === 'designing',
    );

    expect(stage?.refusal).toStrictEqual({
      reason: 'no failing test covers it',
      at: '2026-08-07T10:30:00.000Z',
      gate: 'write',
    });
  });
});
