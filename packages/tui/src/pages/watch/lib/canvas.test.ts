import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { JourneyNodeView, JourneyView } from '../../../shared/model';

import { journeyRows } from './canvas.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const WIDE = { width: 200, height: 40 };

function nodeOf(id: string, patch: Partial<JourneyNodeView> = {}): JourneyNodeView {
  return {
    id,
    title: id,
    mark: 'done',
    at: undefined,
    until: undefined,
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
    nodeOf('designing', { mark: 'active', at: '2026-08-07T10:00:00.000Z' }),
    nodeOf('awaiting-approval', { mark: 'future' }),
    nodeOf('implementing', { mark: 'future' }),
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'awaiting-approval'],
    ['awaiting-approval', 'implementing'],
  ],
  standing: undefined,
  artifacts: [],
  children: [],
};

function textOf(rows: Ln[]): string {
  return rows.map((row) => row.map((span) => span.text).join('')).join('\n');
}

describe('the nodes a canvas paints', () => {
  it('paints every title with the mark its state wears', () => {
    const frame = textOf(journeyRows(WALKED, 'designing', NOW, 0, WIDE));

    expect(frame).toContain('triaged');
    expect(frame).toContain('✓ 3h');
    expect(frame).toContain('designing');
    expect(frame).toContain('awaiting-approval');
    expect(frame).toContain('○ waiting');
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

  it('walks a dot along the edges touching the selection', () => {
    const first = textOf(journeyRows(WALKED, 'designing', NOW, 2, WIDE));
    const second = textOf(journeyRows(WALKED, 'designing', NOW, 3, WIDE));

    expect(first).toContain('●');
    expect(second).toContain('●');
    expect(first).not.toBe(second);
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
