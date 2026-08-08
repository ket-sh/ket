import { describe, expect, it } from 'vitest';

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
  action: undefined,
};

const HOUR = 3_600_000;

const MINUTE = 60_000;

function reportOf(over: Partial<Retro>): string {
  return renderRetro({ ...EMPTY, ...over });
}

const TEST_FIRST = 'no failing test covers this edit';

describe('the refusals a report gathers', () => {
  it('names the gate, the count and the reason on one line', () => {
    const clusters = [{ gate: 'write', reason: TEST_FIRST, count: 7 }];

    expect(reportOf({ clusters })).toContain(`- \`write\` refused 7 times: ${TEST_FIRST}`);
  });

  it('says once rather than one time, so the line reads as English', () => {
    const clusters = [{ gate: 'review', reason: 'the design names no spec', count: 1 }];

    expect(reportOf({ clusters })).toContain('- `review` refused once: the design names no spec');
  });

  it('files the clusters under what slowed you', () => {
    const clusters = [{ gate: 'write', reason: TEST_FIRST, count: 2 }];

    expect(reportOf({ clusters })).toContain(
      '## What slowed you\n\n### Refusals by gate and reason',
    );
  });
});

describe('the stall a report names', () => {
  it('names the item, the stage and how long the quiet ran', () => {
    const stall = { key: 'K-1', stage: 'implementing', span: 3 * HOUR + 30 * MINUTE };

    expect(reportOf({ stall })).toContain(
      '### The longest stall\n\n`K-1` sat at implementing for 3h 30m.\n',
    );
  });

  it('hides the stall heading when no quiet was long enough to name', () => {
    expect(reportOf({ rework: [{ key: 'K-1', count: 2 }] })).not.toContain('### The longest stall');
  });
});

describe('the rework a report counts', () => {
  it('counts the times an item went back down the pipeline', () => {
    expect(reportOf({ rework: [{ key: 'K-1', count: 2 }] })).toContain(
      '### Rework loops\n\n- `K-1` went backward 2 times',
    );
  });

  it('says once for the single loop, so the line reads as English', () => {
    expect(reportOf({ rework: [{ key: 'K-1', count: 1 }] })).toContain('went backward once');
  });
});

describe('where a report says the time went', () => {
  it('splits the quiet between the person and the machine', () => {
    const split = { waiting: 2 * HOUR, working: 45 * MINUTE };

    expect(reportOf(split)).toContain(
      '### Where the time went\n\nWaiting on a person: 2h 0m. Machine working: 45m.\n',
    );
  });

  it('hides the split when no quiet was measured at all', () => {
    expect(reportOf({ rework: [{ key: 'K-1', count: 1 }] })).not.toContain(
      '### Where the time went',
    );
  });

  it('shows the split when only the machine worked', () => {
    expect(reportOf({ working: 45 * MINUTE })).toContain('Machine working: 45m.');
  });

  it('shows the split when the person and the machine took the same time', () => {
    const split = { waiting: 2 * HOUR, working: 2 * HOUR };

    expect(reportOf(split)).toContain('Waiting on a person: 2h 0m. Machine working: 2h 0m.');
  });
});

describe('the one action a report asks for', () => {
  it('asks for a mechanical check when a gate kept refusing the same thing', () => {
    const cluster = { gate: 'write', reason: TEST_FIRST, count: 7 };

    expect(reportOf({ action: { cluster } })).toContain(
      `## The one action\n\n\`write\` refused 7 times, each for the same reason: ${TEST_FIRST}. Consider a mechanical check, \`ket gate write\` run where the work starts, so the rule stops the edit before the edit lands.\n`,
    );
  });

  it('asks for a rule change with its record when a gate refused only once', () => {
    const cluster = { gate: 'review', reason: 'the design names no spec', count: 1 };

    expect(reportOf({ action: { cluster } })).toContain(
      '`review` refused once, for this reason: the design names no spec. Consider a rule change, recorded in an ADR, since a single refusal shows no pattern yet.',
    );
  });

  it('reads a reason that already ended in a stop without doubling it', () => {
    const cluster = { gate: 'transition', reason: 'not verified yet.', count: 1 };

    expect(reportOf({ action: { cluster } })).toContain(
      'for this reason: not verified yet. Consider',
    );
  });

  it('asks for one action and never a second', () => {
    const cluster = { gate: 'write', reason: TEST_FIRST, count: 7 };
    const report = reportOf({
      action: { cluster },
      clusters: [cluster, { gate: 'review', reason: '', count: 1 }],
    });

    expect(report.split('Consider')).toHaveLength(2);
  });
});
