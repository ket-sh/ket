import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { JourneyNodeView, JourneyPaneView, JourneyView } from '../../../shared/model';

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
};

import { journeyRows } from './canvas.ts';

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
    ...patch,
  };
}

const WALKED: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: undefined,
  nodes: [
    nodeOf('triaged', { at: '2026-08-07T09:00:00.000Z', until: '2026-08-07T10:00:00.000Z' }),
    nodeOf('designing', { state: 'running', refusal: undefined, at: '2026-08-07T10:00:00.000Z' }),
    nodeOf('awaiting-approval', { state: 'future' }),
    nodeOf('implementing', { state: 'future' }),
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'awaiting-approval'],
    ['awaiting-approval', 'implementing'],
  ],
  standing: undefined,
  artifacts: [],
  children: [],
  pane: PANE,
};

function textOf(rows: Ln[]): string {
  return rows.map((row) => row.map((span) => span.text).join('')).join('\n');
}

describe('the nodes a canvas paints', () => {
  it('paints every title beside the state it wears and how long it held', () => {
    const frame = textOf(journeyRows(WALKED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('triaged');
    expect(frame).toContain('✓ Done');
    expect(frame).toContain('1h');
    expect(frame).toContain('awaiting-approval');
    expect(frame).toContain('○ Not started');
  });

  it('wears the double border on the selected node alone', () => {
    const frame = textOf(journeyRows(WALKED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('║ designing');
    expect(frame).not.toContain('║ triaged');
  });

  it('spins the active mark with the tick', () => {
    const still = textOf(journeyRows(WALKED, 'triaged', NOW, 0, WIDE));
    const later = textOf(journeyRows(WALKED, 'triaged', NOW, 1, WIDE));

    expect(still).not.toBe(later);
  });
});

describe('the edges a canvas draws', () => {
  it('draws an arrowhead into every stage it joins', () => {
    const frame = textOf(journeyRows(WALKED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('►');
  });

  it('leaves the edges still, so only the running stage moves', () => {
    const settled: JourneyView = {
      ...WALKED,
      nodes: WALKED.nodes.map((node) => ({ ...node, state: 'done' as const })),
    };
    const first = textOf(journeyRows(settled, 'triaged', NOW, 2, WIDE));
    const second = textOf(journeyRows(settled, 'triaged', NOW, 3, WIDE));

    expect(first).toBe(second);
  });
});

describe('the viewport that follows the selection', () => {
  it('pans the selected node into view and lets the far end fall off', () => {
    const view = { width: 40, height: 14 };
    const frame = textOf(journeyRows(WALKED, 'awaiting-approval', NOW, 0, view));

    expect(frame).toContain('awaiting-approval');
    expect(frame).not.toContain('triaged');
  });

  it('sizes every row to the viewport', () => {
    const view = { width: 40, height: 14 };
    const rows = journeyRows(WALKED, 'designing', NOW, 0, view);

    expect(rows).toHaveLength(14);
    expect(rows[0]?.map((span) => span.text).join('')).toHaveLength(40);
  });
});
