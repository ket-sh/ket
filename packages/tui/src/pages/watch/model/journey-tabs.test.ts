import { describe, expect, it } from 'vitest';

import type { JourneyArtifactView, JourneyView } from '../../../shared/model';
import type { Frame, JourneyFocus, JourneyTab } from './frames.ts';

import { docLines } from '../lib/lines.ts';
import { picked, sided, tabbed, walked } from './journey-tabs.ts';

function artifactOf(name: string, tech: string | undefined): JourneyArtifactView {
  return {
    path: `.ket/items/K-1/${name}`,
    name,
    at: undefined,
    doc:
      tech === undefined
        ? undefined
        : { kind: 'prose', label: 'Spec', tech, plain: 'the plain side', note: undefined },
  };
}

const LINES = Array.from({ length: 30 }, (_, held) => `line ${String(held + 1)}`).join('\n');

const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: undefined,
  nodes: [
    {
      id: 'triaged',
      title: 'triaged',
      state: 'running',
      refusal: undefined,
      at: undefined,
      until: undefined,
      note: undefined,
      doc: undefined,
    },
  ],
  edges: [],
  standing: undefined,
  artifacts: [artifactOf('spec.md', LINES), artifactOf('empty.md', undefined)],
  children: [
    {
      key: 'K-2',
      title: 'A quiet fix',
      size: 'subtask',
      status: 'triaged',
      since: undefined,
      refusal: undefined,
    },
  ],
  pane: {
    kind: 'feature',
    size: 'story',
    status: 'triaged',
    stageAt: 2,
    stageOf: 8,
    parent: undefined,
    refusedTimes: 0,
    arrivedAt: undefined,
    lastEventAt: undefined,
    filed: undefined,
    branch: undefined,
    note: undefined,
  },
};

interface Standing {
  tab?: JourneyTab;
  focus?: JourneyFocus;
  pick?: number;
  cur?: number;
  aud?: 'technical' | 'plain';
}

function framed(standing: Standing = {}): Frame[] {
  return [
    { kind: 'board' },
    {
      kind: 'journey',
      journey: JOURNEY,
      sel: 'triaged',
      tab: 'artifacts',
      pick: 0,
      focus: 'canvas',
      cur: 0,
      aud: 'technical',
      ...standing,
    },
  ];
}

function topOf(stack: Frame[]): Extract<Frame, { kind: 'journey' }> | undefined {
  const above = stack[stack.length - 1];

  return above?.kind === 'journey' ? above : undefined;
}

describe('the focus the artifacts list hands around', () => {
  it('hands the tab row the focus at the top of the file list', () => {
    expect(topOf(walked(framed({ pick: 0 }), 'up'))?.focus).toBe('tabs');
  });

  it('keeps walking the files below the top', () => {
    const above = topOf(walked(framed({ pick: 1 }), 'up'));

    expect(above?.pick).toBe(0);
    expect(above?.focus).toBe('canvas');
  });

  it('enters the doc on the right where the file carries one', () => {
    const above = topOf(walked(framed({ pick: 0 }), 'right'));

    expect(above?.focus).toBe('content');
    expect(above?.cur).toBe(0);
  });

  it('stays in the list where the file carries no doc', () => {
    expect(topOf(walked(framed({ pick: 1 }), 'right'))?.focus).toBe('canvas');
  });
});

describe('the tabs the focused tab row walks', () => {
  it('walks to the neighboring tab and keeps the row in hand', () => {
    const above = topOf(walked(framed({ focus: 'tabs' }), 'left'));

    expect(above?.tab).toBe('children');
    expect(above?.focus).toBe('tabs');
    expect(above?.pick).toBe(0);
  });

  it('holds the first tab rather than walking past it', () => {
    expect(topOf(walked(framed({ tab: 'workflow', focus: 'tabs' }), 'left'))?.tab).toBe('workflow');
  });

  it('drops the focus into the panel on the way down', () => {
    expect(topOf(walked(framed({ focus: 'tabs' }), 'down'))?.focus).toBe('canvas');
  });

  it('ignores the way up', () => {
    expect(topOf(walked(framed({ focus: 'tabs' }), 'up'))?.focus).toBe('tabs');
  });
});

describe('the reading cursor inside the doc', () => {
  it('walks down a line at a time', () => {
    expect(topOf(walked(framed({ focus: 'content', cur: 3 }), 'down'))?.cur).toBe(4);
  });

  it('clamps at the last line of the doc', () => {
    const doc = JOURNEY.artifacts[0]?.doc;
    const held = doc === undefined ? 0 : docLines(doc, 'technical').length;

    expect(topOf(walked(framed({ focus: 'content', cur: 60 }), 'down'))?.cur).toBe(held - 1);
  });

  it('clamps at the first line on the way up', () => {
    expect(topOf(walked(framed({ focus: 'content', cur: 0 }), 'up'))?.cur).toBe(0);
  });

  it('hands the focus back to the file list on the way left', () => {
    expect(topOf(walked(framed({ focus: 'content', cur: 4 }), 'left'))?.focus).toBe('canvas');
  });
});

describe('the reading a pointer steers', () => {
  it('seats the pick under the pointed row and rewinds the cursor', () => {
    const above = topOf(picked(framed({ pick: 0, cur: 7 }), 1));

    expect(above?.pick).toBe(1);
    expect(above?.cur).toBe(0);
  });

  it('retunes the reading audience and rewinds the cursor', () => {
    const above = topOf(sided(framed({ cur: 7 }), 'plain'));

    expect(above?.aud).toBe('plain');
    expect(above?.cur).toBe(0);
  });

  it('leaves a stack whose top is no journey alone', () => {
    const board: Frame[] = [{ kind: 'board' }];

    expect(picked(board, 1)).toBe(board);
    expect(sided(board, 'plain')).toBe(board);
  });
});

describe('the reading a tab switch rewinds', () => {
  it('takes the plain panel focus and rewinds the cursor', () => {
    const above = topOf(tabbed(framed({ focus: 'tabs', cur: 9 })));

    expect(above?.focus).toBe('canvas');
    expect(above?.cur).toBe(0);
  });
});
