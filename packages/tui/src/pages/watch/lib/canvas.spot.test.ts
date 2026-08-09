import { describe, expect, it } from 'vitest';

import type { JourneyView } from '../../../shared/model';

import { overflowsAcross, stageAt } from './canvas.ts';

function nodeOf(id: string): JourneyView['nodes'][number] {
  return {
    id,
    title: id,
    state: 'future',
    refusal: undefined,
    at: undefined,
    until: undefined,
    note: undefined,
    doc: undefined,
  };
}

function journeyOf(ids: string[]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes: ids.map((id) => nodeOf(id)),
    edges: ids.slice(1).map((id, at) => [ids[at] ?? id, id]),
    standing: undefined,
    artifacts: [],
    children: [],
    pane: {
      kind: 'feature',
      size: 'story',
      status: 'designing',
      stageAt: 1,
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

const CHAIN = journeyOf(['one', 'two', 'three']);

const ROOMY = { width: 200, height: 20 };

describe('the stage a canvas click lands on', () => {
  it('lands on the stage whose box holds the spot', () => {
    expect(stageAt(CHAIN, 'one', ROOMY, { x: 3, y: 3 })).toBe('one');
    expect(stageAt(CHAIN, 'one', ROOMY, { x: 36, y: 2 })).toBe('two');
  });

  it('lands nowhere between or past the stages', () => {
    expect(stageAt(CHAIN, 'one', ROOMY, { x: 30, y: 3 })).toBeUndefined();
    expect(stageAt(CHAIN, 'one', ROOMY, { x: 3, y: 9 })).toBeUndefined();
    expect(stageAt(CHAIN, 'one', ROOMY, { x: 150, y: 3 })).toBeUndefined();
  });

  it('reads the spot through the pan the selection sets', () => {
    const narrow = { width: 40, height: 20 };

    expect(stageAt(CHAIN, 'three', narrow, { x: 13, y: 3 })).toBe('three');
    expect(stageAt(CHAIN, 'three', narrow, { x: 4, y: 3 })).toBe('two');
    expect(stageAt(CHAIN, 'three', narrow, { x: 39, y: 3 })).toBeUndefined();
  });
});

describe('the overflow that lets the wheel walk', () => {
  it('overflows where the laid stages outrun the view', () => {
    expect(overflowsAcross(CHAIN, 90)).toBe(true);
  });

  it('fits where the view holds every stage', () => {
    expect(overflowsAcross(CHAIN, 96)).toBe(false);
  });

  it('never overflows an empty journey', () => {
    expect(overflowsAcross(journeyOf([]), 10)).toBe(false);
  });
});
