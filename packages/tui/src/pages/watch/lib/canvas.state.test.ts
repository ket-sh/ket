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
};

import { journeyRows } from './canvas.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const WIDE = { width: 200, height: 40 };

function nodeOf(id: string, patch: Partial<JourneyNodeView> = {}): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'future',
    at: undefined,
    until: undefined,
    refusal: undefined,
    doc: undefined,
    ...patch,
  };
}

function journeyOf(nodes: JourneyNodeView[]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes,
    edges: [],
    standing: undefined,
    artifacts: [],
    children: [],
    pane: PANE,
  };
}

function textOf(rows: Ln[]): string {
  return rows.map((row) => row.map((span) => span.text).join('')).join('\n');
}

function painted(node: JourneyNodeView, tick = 0): string {
  return textOf(journeyRows(journeyOf([node]), node.id, NOW, tick, WIDE));
}

describe('the words a stage state speaks', () => {
  it('says a stage nobody has started is not started', () => {
    expect(painted(nodeOf('implementing'))).toContain('Not started');
  });

  it('says the stage the machine works in is running', () => {
    const frame = painted(
      nodeOf('designing', { state: 'running', at: '2026-08-07T10:00:00.000Z' }),
    );

    expect(frame).toContain('Running');
  });

  it('says a gate the viewer can pass needs them', () => {
    const frame = painted(
      nodeOf('awaiting-approval', { state: 'needs-you', at: '2026-08-07T10:00:00.000Z' }),
    );

    expect(frame).toContain('Needs you');
  });

  it('says a reworked stage has changes requested', () => {
    const frame = painted(
      nodeOf('designing', { state: 'changes-requested', at: '2026-08-07T10:00:00.000Z' }),
    );

    expect(frame).toContain('Changes requested');
  });

  it('says a refused move was sent back', () => {
    const frame = painted(
      nodeOf('designing', { state: 'sent-back', at: '2026-08-07T10:00:00.000Z' }),
    );

    expect(frame).toContain('Sent back');
  });
});

describe('the glyph a stage state wears beside its word', () => {
  it('marks a human gate with the double bar', () => {
    expect(
      painted(nodeOf('awaiting-approval', { state: 'needs-you', at: '2026-08-07T10:00:00.000Z' })),
    ).toContain('‖');
  });

  it('marks a refusal with a cross', () => {
    expect(
      painted(nodeOf('designing', { state: 'sent-back', at: '2026-08-07T10:00:00.000Z' })),
    ).toContain('✗');
  });

  it('marks a finished stage with a check', () => {
    expect(painted(nodeOf('triaged', { state: 'done', at: '2026-08-07T09:00:00.000Z' }))).toContain(
      '✓',
    );
  });

  it('marks a stage nobody has started with a hollow ring', () => {
    expect(painted(nodeOf('implementing'))).toContain('○');
  });
});

describe('the one thing that moves', () => {
  it('spins the braille wheel on the running stage', () => {
    const node = nodeOf('designing', { state: 'running', at: '2026-08-07T10:00:00.000Z' });

    expect(painted(node, 0)).not.toBe(painted(node, 1));
  });

  it('holds every other state still across ticks', () => {
    for (const state of ['done', 'future', 'needs-you', 'sent-back'] as const) {
      const node = nodeOf('designing', { state, at: '2026-08-07T10:00:00.000Z' });

      expect(painted(node, 0)).toBe(painted(node, 1));
    }
  });
});
