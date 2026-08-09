import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { JourneyNodeView, JourneyPaneView, JourneyView } from '../../../shared/model';

import { journeyRows, stageAt } from './canvas.ts';
import { NODE_H } from './layout.ts';

const PANE: JourneyPaneView = {
  kind: 'feature',
  size: 'story',
  status: 'designing',
  stageAt: 3,
  stageOf: 8,
  parent: undefined,
  refusedTimes: 0,
  arrivedAt: undefined,
  lastEventAt: undefined,
  filed: undefined,
  branch: undefined,
  note: undefined,
  offers: [],
};

const NOW = '2026-08-07T12:00:00.000Z';

const WIDE = { width: 200, height: 40 };

function nodeOf(id: string, patch: Partial<JourneyNodeView> = {}): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'done',
    refusal: undefined,
    at: undefined,
    until: undefined,
    note: undefined,
    doc: undefined,
    steps: [],
    ...patch,
  };
}

const STEPPED: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: undefined,
  nodes: [
    nodeOf('designing', {
      state: 'running',
      at: '2026-08-07T10:00:00.000Z',
      steps: [
        { name: 'spec.md', at: '2026-08-07T10:30:00.000Z' },
        { name: 'solution-design.md', at: '2026-08-07T11:00:00.000Z' },
      ],
    }),
    nodeOf('awaiting-approval', { state: 'future' }),
  ],
  edges: [['designing', 'awaiting-approval']],
  standing: undefined,
  artifacts: [],
  children: [],
  pane: PANE,
};

function spokenOf(row: Ln): string {
  return row.map((span) => span.text).join('');
}

function textOf(rows: Ln[]): string {
  return rows.map(spokenOf).join('\n');
}

describe('the sub-steps a stage wears as boxes', () => {
  it('draws every step in its own box under the stage', () => {
    const frame = textOf(journeyRows(STEPPED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('✓ spec.md');
    expect(frame).toContain('✓ solution-design');
  });

  it('draws the steps below the stage box rather than inside it', () => {
    const rows = journeyRows(STEPPED, 'designing', NOW, 0, WIDE);
    const stepRow = rows.map(spokenOf).findIndex((row) => row.includes('✓ spec.md'));

    expect(stepRow).toBeGreaterThanOrEqual(NODE_H);
  });

  it('answers a click on a step box with the stage that owns it', () => {
    const spot = { x: 5, y: NODE_H + 3 };

    expect(stageAt(STEPPED, 'designing', WIDE, spot)).toBe('designing');
  });

  it('keeps a stage with no steps at its plain height', () => {
    const frame = textOf(journeyRows(STEPPED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('awaiting-approval');
  });
});
