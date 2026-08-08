import { describe, expect, it } from 'vitest';

import type { DormantGate } from './dormant.ts';
import type { Retro } from './fold.ts';

import { renderRetro } from './report.ts';

const EMPTY: Retro = {
  window: {
    from: Date.parse('2026-08-03T00:00:00.000Z'),
    to: Date.parse('2026-08-08T12:00:00.000Z'),
  },
  events: 0,
  entered: [],
  shipped: [],
  inFlight: [],
  unmoved: [],
  clusters: [],
  stall: undefined,
  rework: [],
  waiting: 0,
  working: 0,
  actions: [],
};

const DUP: DormantGate = {
  gate: 'lint:dup',
  guards: 'It finds knowledge written twice.',
  seen: undefined,
};

function reportOf(dormant: DormantGate): string {
  const draft = {
    number: 1,
    sentence: `a draft on \`${dormant.gate}\``,
    evidence: { gate: dormant.gate, reason: undefined, moments: [], items: [] },
  };

  return renderRetro({ ...EMPTY, actions: [{ dormant, draft }] });
}

describe('the action a report asks for when no gate refused anything', () => {
  it('names a gate the log has never recorded, and asks for a look rather than a removal', () => {
    expect(reportOf(DUP)).toContain(
      '## The one action\n\nNo gate refused anything in this window, and the log has never recorded `lint:dup`. It finds knowledge written twice. The log sees a gate only when a session runs its script, so a run at commit time or in CI leaves no line here. Examine whether the rule still earns its place.\n',
    );
  });

  it('names the moment a gate was last recorded, when history holds one', () => {
    expect(reportOf({ ...DUP, seen: Date.parse('2026-07-02T09:00:00.000Z') })).toContain(
      'the log last recorded `lint:dup` at 2026-07-02T09:00:00.000Z. It finds knowledge written twice. The log sees a gate only when a session runs its script, so a run at commit time or in CI leaves no line here. Examine whether the rule still earns its place.\n',
    );
  });
});
