import type { GateSemantics } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import type { RetroAction } from './fold.ts';
import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

const TEST_FIRST = 'the test comes first';

const NO_SPEC = 'the design names no spec';

function turnedAway(gate: string, item: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate, outcome: 'refused', about: 'src/a.ts', item, at, reason })}\n`;
}

function moved(at: string): string {
  return `${JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: 'triaged',
    item: 'K-1',
    at,
  })}\n`;
}

function gateOf(script: string): GateSemantics {
  return { script, guards: `It guards ${script}.`, commitJob: script, ciJob: 'check' };
}

function actionsOf(log: string, gates: GateSemantics[] = []): RetroAction[] {
  return foldRetro(WORKING, log, WINDOW, gates).actions;
}

const CROWDED =
  turnedAway('review', 'K-1', '2026-08-04T08:00:00.000Z', NO_SPEC) +
  turnedAway('write', 'K-1', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
  turnedAway('write', 'K-2', '2026-08-04T10:00:00.000Z', TEST_FIRST);

describe('the drafts a retro numbers for its actions', () => {
  it('drafts one action per cluster, numbered 1 up in the order the clusters rank', () => {
    const actions = actionsOf(CROWDED);

    expect(actions.map((action) => action.draft.number)).toStrictEqual([1, 2]);
    expect(actions.map((action) => ('cluster' in action ? action.cluster.gate : ''))).toStrictEqual(
      ['write', 'review'],
    );
  });

  it('writes a sentence naming the gate, the count and the reason', () => {
    expect(actionsOf(CROWDED).at(0)?.draft.sentence).toBe(
      '`write` refused 2 times: the test comes first; run `ket gate write` where the work starts',
    );
  });

  it('asks a single refusal for a rule change rather than a mechanical check', () => {
    expect(actionsOf(CROWDED).at(1)?.draft.sentence).toBe(
      '`review` refused once: the design names no spec; consider a rule change recorded in an ADR',
    );
  });

  it('reads a reason that ended in a stop without carrying the stop into the sentence', () => {
    const log = turnedAway('transition', 'K-1', '2026-08-04T09:00:00.000Z', 'not verified yet.');

    expect(actionsOf(log).at(0)?.draft.sentence).toBe(
      '`transition` refused once: not verified yet; consider a rule change recorded in an ADR',
    );
  });

  it('carries the moments and the items the refusals landed on as evidence', () => {
    expect(actionsOf(CROWDED).at(0)?.draft.evidence).toStrictEqual({
      gate: 'write',
      reason: TEST_FIRST,
      moments: ['2026-08-04T09:00:00.000Z', '2026-08-04T10:00:00.000Z'],
      items: ['K-1', 'K-2'],
    });
  });

  it('folds the same log into the same drafts, numbers and all', () => {
    expect(actionsOf(CROWDED)).toStrictEqual(actionsOf(CROWDED));
  });

  it('drafts nothing when the window holds nothing to act on', () => {
    expect(actionsOf('')).toStrictEqual([]);
  });
});

describe('the draft a quiet week writes for its dormant gate', () => {
  const BUSY = moved('2026-08-04T09:00:00.000Z');

  it('drafts the quiet gate as draft 1 when nothing was refused', () => {
    const actions = actionsOf(BUSY, [gateOf('lint:dup')]);

    expect(actions).toHaveLength(1);
    expect(actions.at(0)?.draft).toStrictEqual({
      number: 1,
      sentence:
        'the log has never recorded `lint:dup`; examine whether the rule still earns its place',
      evidence: { gate: 'lint:dup', reason: undefined, moments: [], items: [] },
    });
  });

  it('names the moment history last recorded the quiet gate', () => {
    const seen = `${JSON.stringify({
      gate: 'lint:dup',
      outcome: 'allowed',
      about: 'src/a.ts',
      item: 'K-1',
      at: '2026-07-02T09:00:00.000Z',
    })}\n`;

    expect(actionsOf(seen + BUSY, [gateOf('lint:dup')]).at(0)?.draft).toStrictEqual({
      number: 1,
      sentence:
        'the log last recorded `lint:dup` at 2026-07-02T09:00:00.000Z; examine whether the rule still earns its place',
      evidence: {
        gate: 'lint:dup',
        reason: undefined,
        moments: ['2026-07-02T09:00:00.000Z'],
        items: [],
      },
    });
  });

  it('leaves the quiet gate without a draft while a refusal holds the week', () => {
    const log = BUSY + turnedAway('write', 'K-1', '2026-08-04T10:00:00.000Z', TEST_FIRST);
    const actions = actionsOf(log, [gateOf('lint:dup')]);

    expect(actions).toHaveLength(1);
    expect(actions.at(0)?.draft.evidence.gate).toBe('write');
  });
});
