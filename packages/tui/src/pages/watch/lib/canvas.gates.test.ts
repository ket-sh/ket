import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { JourneyNodeView, JourneyView } from '../../../shared/model';

import { KANAGAWA } from '../../../shared/theme';
import { journeyRows } from './canvas.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const ARRIVED = '2026-08-07T10:00:00.000Z';

const ROOMY = { width: 200, height: 40 };

function stageOf(id: string, patch: Partial<JourneyNodeView> = {}): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'future',
    at: undefined,
    until: undefined,
    refusal: undefined,
    note: undefined,
    doc: undefined,
    ...patch,
  };
}

function pathOf(nodes: JourneyNodeView[]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes,
    edges: [],
    standing: undefined,
    artifacts: [],
    children: [],
    pane: {
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
    },
  };
}

function drawn(nodes: JourneyNodeView[], selected: string, tick = 0): Ln[] {
  return journeyRows(pathOf(nodes), selected, NOW, tick, ROOMY);
}

function spoken(rows: Ln[]): string {
  return rows.map((row) => row.map((span) => span.text).join('')).join('\n');
}

function cornerColorsOf(rows: Ln[]): (string | undefined)[] {
  return rows.flatMap((row) =>
    row.filter((span) => span.text.includes('╭')).map((span) => span.fg),
  );
}

describe('the mark a human gate wears in its title', () => {
  it('carries the double bar on the approval gate, whatever its state', () => {
    const waiting = spoken(
      drawn(
        [stageOf('awaiting-approval', { state: 'needs-you', at: ARRIVED })],
        'awaiting-approval',
      ),
    );
    const passed = spoken(
      drawn([stageOf('awaiting-approval', { state: 'done', at: ARRIVED })], 'awaiting-approval'),
    );
    const ahead = spoken(drawn([stageOf('awaiting-approval')], 'awaiting-approval'));

    expect(waiting).toContain('‖ awaiting-approval');
    expect(passed).toContain('‖ awaiting-approval');
    expect(ahead).toContain('‖ awaiting-approval');
  });

  it('carries the double bar on the merge gate', () => {
    const frame = spoken(drawn([stageOf('awaiting-merge')], 'awaiting-merge'));

    expect(frame).toContain('‖ awaiting-merge');
  });

  it('leaves the machine stages without the gate mark', () => {
    const frame = spoken(
      drawn([stageOf('designing', { state: 'running', at: ARRIVED })], 'designing'),
    );

    expect(frame).toContain('designing');
    expect(frame).not.toContain('‖ designing');
  });
});

describe('the invitation a waiting gate makes', () => {
  it('says the gate is yours while it needs you', () => {
    const frame = spoken(
      drawn(
        [stageOf('awaiting-approval', { state: 'needs-you', at: ARRIVED })],
        'awaiting-approval',
      ),
    );

    expect(frame).toContain('yours');
  });

  it('keeps a passed gate as a record rather than an invitation', () => {
    const frame = spoken(
      drawn([stageOf('awaiting-approval', { state: 'done', at: ARRIVED })], 'awaiting-approval'),
    );

    expect(frame).toContain('✓ Done');
    expect(frame).not.toContain('yours');
  });

  it('leaves a gate nobody reached quiet', () => {
    const frame = spoken(drawn([stageOf('awaiting-merge')], 'awaiting-merge'));

    expect(frame).toContain('○ Not started');
    expect(frame).not.toContain('yours');
  });

  it('holds a waiting gate still across ticks', () => {
    const nodes = [stageOf('awaiting-approval', { state: 'needs-you', at: ARRIVED })];

    expect(spoken(drawn(nodes, 'awaiting-approval', 0))).toBe(
      spoken(drawn(nodes, 'awaiting-approval', 1)),
    );
  });
});

describe('the accent a waiting gate wears', () => {
  const path = [
    stageOf('designing', { state: 'done', at: ARRIVED, until: '2026-08-07T11:00:00.000Z' }),
    stageOf('awaiting-approval', { state: 'needs-you', at: '2026-08-07T11:00:00.000Z' }),
  ];

  it('borders the gate that needs you in the full stage accent', () => {
    const corners = cornerColorsOf(drawn(path, 'designing'));

    expect(corners).toContain(KANAGAWA.yellow);
  });

  it('keeps a passed gate dimmed like the rest of the record', () => {
    const passed = [
      stageOf('awaiting-approval', {
        state: 'done',
        at: ARRIVED,
        until: '2026-08-07T11:00:00.000Z',
      }),
      stageOf('implementing', { state: 'running', at: '2026-08-07T11:00:00.000Z' }),
    ];
    const corners = cornerColorsOf(drawn(passed, 'implementing'));

    expect(corners).not.toContain(KANAGAWA.yellow);
  });
});
