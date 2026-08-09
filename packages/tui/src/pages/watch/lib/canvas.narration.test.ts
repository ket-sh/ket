import { describe, expect, it } from 'vitest';

import type { Ln } from '../../../shared/lib';
import type { ItemNoteView, JourneyNodeView, JourneyView } from '../../../shared/model';

import { journeyRows } from './canvas.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const ROOMY = { width: 200, height: 40 };

function narrated(text: string): ItemNoteView {
  return { text, actor: 'decomposer', at: '2026-08-07T11:00:00.000Z' };
}

function stageOf(id: string, patch: Partial<JourneyNodeView> = {}): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'done',
    at: undefined,
    until: undefined,
    refusal: undefined,
    doc: undefined,
    note: undefined,
    ...patch,
  };
}

function walked(nodes: JourneyNodeView[]): JourneyView {
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

function spoken(nodes: JourneyNodeView[]): string {
  return journeyRows(walked(nodes), 'designing', NOW, 0, ROOMY)
    .map((row: Ln) => row.map((span) => span.text).join(''))
    .join('\n');
}

describe('the narration under the running stage', () => {
  it('says what is happening inside the stage at work', () => {
    const frame = spoken([
      stageOf('designing', {
        state: 'running',
        at: '2026-08-07T10:00:00.000Z',
        note: narrated('researching the breakdown'),
      }),
    ]);

    expect(frame).toContain('researching the break');
  });

  it('cuts the narration to fit the stage it sits in', () => {
    const frame = spoken([
      stageOf('designing', {
        state: 'running',
        at: '2026-08-07T10:00:00.000Z',
        note: narrated('measuring the blast radius of the change'),
      }),
    ]);

    expect(frame).toContain('measuring the blast r…');
  });

  it('leaves a stage nobody narrated silent', () => {
    const frame = spoken([
      stageOf('designing', { state: 'running', at: '2026-08-07T10:00:00.000Z' }),
      stageOf('triaged', {
        at: '2026-08-07T08:00:00.000Z',
        until: '2026-08-07T10:00:00.000Z',
      }),
    ]);

    expect(frame).not.toContain('researching');
  });
});
