import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { SurfaceDocView } from '../../../shared/model';

import { audienceAt, docLines } from './lines.ts';

function textOf(lines: Ln[]): string {
  return lines.map((line) => line.map((span) => span.text).join('')).join('\n');
}

function spansOf(lines: Ln[]): { text: string; fg?: string | undefined }[] {
  return lines.flat();
}

const PROSE: SurfaceDocView = {
  kind: 'prose',
  label: 'Spec',
  tech: '# The spec\n\nFive failures lock `src/auth.ts` for good.\n\n- no override',
  plain: 'Five tries and you wait.',
  note: undefined,
};

describe('the audience switch a prose doc wears', () => {
  it('offers both sides and shows the asked one', () => {
    const technical = textOf(docLines(PROSE, 'technical'));
    const plain = textOf(docLines(PROSE, 'plain'));

    expect(technical).toContain('Technical');
    expect(technical).toContain('Plain language');
    expect(technical).toContain('Five failures lock');
    expect(plain).toContain('Five tries and you wait.');
  });

  it('says so when no plain version exists', () => {
    const alone = textOf(docLines({ ...PROSE, plain: undefined }, 'technical'));

    expect(alone).toContain('No plain version written.');
  });

  it('carries the lag note beside the tabs', () => {
    const lagged = textOf(
      docLines({ ...PROSE, note: 'Plain version lags behind its source.' }, 'technical'),
    );

    expect(lagged).toContain('Plain version lags behind its source.');
  });

  it('renders backtick spans as chips and bullets as dots', () => {
    const lines = docLines(PROSE, 'technical');

    expect(spansOf(lines).some((span) => span.text.includes(' src/auth.ts '))).toBe(true);
    expect(textOf(lines)).toContain('• no override');
  });
});

describe('the audience a pill column names', () => {
  it('reads technical across the first pill', () => {
    expect(audienceAt(PROSE, 0)).toBe('technical');
    expect(audienceAt(PROSE, 10)).toBe('technical');
  });

  it('reads plain across the second pill', () => {
    expect(audienceAt(PROSE, 13)).toBe('plain');
    expect(audienceAt(PROSE, 28)).toBe('plain');
  });

  it('reads nothing between and past the pills', () => {
    expect(audienceAt(PROSE, 11)).toBeUndefined();
    expect(audienceAt(PROSE, 29)).toBeUndefined();
  });

  it('offers no side where no plain version exists', () => {
    expect(audienceAt({ ...PROSE, plain: undefined }, 5)).toBeUndefined();
  });

  it('offers no side on a doc without audiences', () => {
    const flat: SurfaceDocView = {
      kind: 'criteria',
      label: 'Criteria',
      name: 'locking.feature',
      source: 'Feature: locking',
    };

    expect(audienceAt(flat, 5)).toBeUndefined();
  });
});

describe('the design doc and its sketch', () => {
  const DESIGN: SurfaceDocView = {
    kind: 'design',
    label: 'Design',
    tech: 'The account locks after five failures, and the keeper holds the count.',
    plain: undefined,
    note: undefined,
    callouts: [{ claim: 'locks after five failures', shape: 'lock' }],
    sketch: {
      nodes: [
        { id: 'login', label: 'the screen' },
        { id: 'lock', label: 'the keeper' },
      ],
      edges: [{ from: 'login', to: 'lock', label: 'fifth failure' }],
    },
  };

  it('marks the claim with a superscript and lists the legend', () => {
    const frame = textOf(docLines(DESIGN, 'technical'));

    expect(frame).toContain('locks after five failures¹');
    expect(frame).toContain('¹ lock');
  });

  it('draws the sketch boxes with their labels and the edge label above', () => {
    const frame = textOf(docLines(DESIGN, 'technical'));

    expect(frame).toContain('the screen');
    expect(frame).toContain('the keeper');
    expect(frame).toContain('fifth failure');
    expect(frame).toContain('►');
  });
});

describe('the decision doc and its matrix', () => {
  const DECISION: SurfaceDocView = {
    kind: 'decision',
    label: 'Decision',
    tech: '# The call\n\nStatus: accepted\nDate: 2026-08-06\n\nThe counter lives with the session.',
    plain: undefined,
    drivers: ['durability', 'simplicity'],
    rows: [
      { option: 'session store', chosen: true, glyphs: ['++', '+'] },
      { option: 'database', chosen: false, glyphs: ['+', '-'] },
    ],
  };

  it('renders badges, the padded matrix, the chosen tag, and the note verbatim', () => {
    const frame = textOf(docLines(DECISION, 'technical'));

    expect(frame).toContain('Status');
    expect(frame).toContain('accepted');
    expect(frame).toContain('durability');
    expect(frame).toContain('chosen');
    expect(frame).toContain(
      'No column is summed and no row is scored. The matrix shows the reading, the decision stays in the prose.',
    );
  });

  it('colors the verdict glyphs by their reading', () => {
    const spans = spansOf(docLines(DECISION, 'technical'));
    const yes = spans.find((span) => span.text.startsWith('++'));
    const no = spans.find((span) => span.text.startsWith('-') && !span.text.startsWith('--'));

    expect(yes?.fg).not.toBe(no?.fg);
  });
});

describe('the criteria, the diff, the blast, and the ledger', () => {
  it('names the feature card and colors the gherkin keywords', () => {
    const doc: SurfaceDocView = {
      kind: 'criteria',
      label: 'Criteria',
      name: 'locking.feature',
      source: 'Feature: locking\n\n  Scenario: the fifth locks\n    Given four failures',
    };
    const lines = docLines(doc, 'technical');

    expect(textOf(lines)).toContain('locking.feature');
    expect(spansOf(lines).some((span) => span.text === 'Given' && span.fg !== undefined)).toBe(
      true,
    );
  });

  it('lays the diff out unified with colored additions and deletions', () => {
    const doc: SurfaceDocView = {
      kind: 'diff',
      label: 'Diff',
      text: '--- a/auth.ts\n+++ b/auth.ts\n@@ -1 +1,2 @@\n-old\n+new',
    };
    const lines = docLines(doc, 'technical');
    const added = spansOf(lines).find((span) => span.text === '+new');
    const dropped = spansOf(lines).find((span) => span.text === '-old');

    expect(textOf(lines)).toContain('Unified');
    expect(added?.fg).not.toBe(dropped?.fg);
  });
});

describe('the blast and the ledger', () => {
  it('opens the blast with its measure chips and closes with the budget sentence', () => {
    const doc: SurfaceDocView = {
      kind: 'blast',
      label: 'Blast',
      base: 'main',
      collapse: 2,
      budget: 24,
      shown: 2,
      uncollapsedNodes: 31,
      uncollapsedEdges: 58,
      sketch: { nodes: [{ id: 'a', label: 'a' }], edges: [] },
    };
    const frame = textOf(docLines(doc, 'technical'));

    expect(frame).toContain('main');
    expect(frame).toContain(
      'Collapsed to 2 path segments so 2 nodes stay inside the 24 node budget. The uncollapsed graph carries 31 modules and 58 edges.',
    );
  });

  it('lists the ledger with refusals in their own color', () => {
    const doc: SurfaceDocView = {
      kind: 'ledger',
      label: 'Ledger',
      lines: [
        { at: '2026-08-07T09:10:00.000Z', text: 'write · allowed · spec.md', refused: false },
        {
          at: '2026-08-07T09:30:00.000Z',
          text: 'write · refused · src/auth.ts',
          refused: true,
        },
      ],
    };
    const lines = docLines(doc, 'technical');
    const allowed = spansOf(lines).find((span) => span.text.includes('allowed'));
    const refused = spansOf(lines).find((span) => span.text.includes('refused'));

    expect(refused?.fg).not.toBe(allowed?.fg);
  });
});
