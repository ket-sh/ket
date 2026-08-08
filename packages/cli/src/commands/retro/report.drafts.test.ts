import { describe, expect, it } from 'vitest';

import type { Retro, RetroAction } from './fold.ts';

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

const TEST_FIRST = 'the test comes first';

function clusterAction(gate: string, reason: string, count: number, number: number): RetroAction {
  const moments = ['2026-08-04T09:00:00.000Z'];

  return {
    cluster: { gate, reason, count, moments: [Date.parse(moments[0] ?? '')], items: ['K-1'] },
    draft: {
      number,
      sentence: `\`${gate}\` refused ${String(count)} times: ${reason}; run \`ket gate ${gate}\` where the work starts`,
      evidence: { gate, reason, moments, items: ['K-1'] },
    },
  };
}

function reportOf(actions: RetroAction[]): string {
  return renderRetro({ ...EMPTY, actions });
}

describe('the drafts a report prints under its actions', () => {
  it('prints the draft under the one action, numbered and adoptable', () => {
    expect(reportOf([clusterAction('write', TEST_FIRST, 7, 1)])).toContain(
      '## The one action\n\n' +
        `\`write\` refused 7 times, each for the same reason: ${TEST_FIRST}. ` +
        'Consider a mechanical check, `ket gate write` run where the work starts, ' +
        'so the rule stops the edit before the edit lands.\n\n' +
        `Draft 1: \`write\` refused 7 times: ${TEST_FIRST}; ` +
        'run `ket gate write` where the work starts. Adopt it with `ket retro adopt 1`.\n',
    );
  });

  it('prints every action with its own draft when the week clustered more than one', () => {
    const report = reportOf([
      clusterAction('write', TEST_FIRST, 7, 1),
      clusterAction('shell', 'a tool owns the lockfile', 2, 2),
    ]);

    expect(report).toContain('## The actions\n');
    expect(report).toContain('Adopt it with `ket retro adopt 1`.');
    expect(report).toContain('Adopt it with `ket retro adopt 2`.');
    expect(report.indexOf('Draft 1:')).toBeLessThan(report.indexOf('Draft 2:'));
  });

  it('prints the dormant draft under the quiet-week action', () => {
    const dormant = {
      gate: 'lint:dup',
      guards: 'It finds knowledge written twice.',
      seen: undefined,
    };
    const sentence =
      'the log has never recorded `lint:dup`; examine whether the rule still earns its place';
    const report = reportOf([
      {
        dormant,
        draft: {
          number: 1,
          sentence,
          evidence: { gate: 'lint:dup', reason: undefined, moments: [], items: [] },
        },
      },
    ]);

    expect(report).toContain(
      `Examine whether the rule still earns its place.\n\nDraft 1: ${sentence}. Adopt it with \`ket retro adopt 1\`.\n`,
    );
  });

  it('prints no action heading at all when the retro drafted nothing', () => {
    expect(reportOf([])).not.toContain('action');
  });
});
