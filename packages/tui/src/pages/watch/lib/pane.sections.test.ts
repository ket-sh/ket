import { describe, expect, it } from 'vitest';

import type { JourneyChildView, JourneyPaneView, JourneyView } from '../../../shared/model';

import { paneLinesOf } from './pane.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const FACTS: JourneyPaneView = {
  kind: 'bug',
  size: 'story',
  status: 'designing',
  stageAt: 3,
  stageOf: 8,
  parent: undefined,
  refusedTimes: 0,
  arrivedAt: '2026-08-07T11:48:00.000Z',
  lastEventAt: '2026-08-07T11:51:00.000Z',
  filed: undefined,
  branch: undefined,
  note: undefined,
  offers: [],
};

interface Amended {
  pane?: Partial<JourneyPaneView>;
  standing?: string;
  children?: JourneyChildView[];
}

function journeyOf(amended: Amended = {}): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes: [],
    edges: [],
    standing: amended.standing,
    artifacts: [],
    children: amended.children ?? [],
    pane: { ...FACTS, ...amended.pane },
  };
}

function textOf(amended: Amended = {}, room = 30): string[] {
  return paneLinesOf(journeyOf(amended), NOW, room).map((line) => line.text);
}

describe('the sections the pane frames', () => {
  it('always frames the state under its own labeled rule', () => {
    expect(textOf().some((line) => line.startsWith('\u2500 state '))).toBe(true);
  });

  it('marks every rule so it can wear the frame color', () => {
    const lines = paneLinesOf(journeyOf(), NOW, 30);

    expect(lines.filter((line) => line.tone === 'head').length).toBeGreaterThan(0);
  });

  it('raises the yours rule only where a gate or a refusal waits', () => {
    expect(textOf().some((line) => line.startsWith('\u2500 yours '))).toBe(false);
    expect(
      textOf({ pane: { refusedTimes: 1 }, standing: 'no test covers it' }).some((line) =>
        line.startsWith('\u2500 yours '),
      ),
    ).toBe(true);
  });

  it('frames the narration, the lineage, and the repo only where they speak', () => {
    expect(textOf().some((line) => line.startsWith('\u2500 word '))).toBe(false);
    expect(textOf().some((line) => line.startsWith('\u2500 lineage '))).toBe(false);
    expect(textOf().some((line) => line.startsWith('\u2500 repo '))).toBe(false);

    const spoken = textOf({
      pane: {
        note: { text: 'researching', actor: 'decomposer', at: '2026-08-07T11:30:00.000Z' },
        parent: 'K-9',
        filed: { by: 'Ada Lovelace', at: '2026-08-07T10:00:00.000Z' },
      },
    });

    expect(spoken.some((line) => line.startsWith('\u2500 word '))).toBe(true);
    expect(spoken.some((line) => line.startsWith('\u2500 lineage '))).toBe(true);
    expect(spoken.some((line) => line.startsWith('\u2500 repo '))).toBe(true);
  });
});

describe('the offers the pane extends', () => {
  it('spells the approve gate with the key that answers it', () => {
    expect(textOf({ pane: { offers: ['approve'] } }, 40)).toContain('\u2016 press a to approve');
  });

  it('spells every offer the item extends', () => {
    const lines = textOf({ pane: { offers: ['ship', 'reopen'] } }, 40);

    expect(lines).toContain('\u2016 press s to ship');
    expect(lines).toContain('\u2016 press o to reopen');
  });

  it('marks the offer line so it can wear the attention color', () => {
    const lines = paneLinesOf(journeyOf({ pane: { offers: ['approve'] } }), NOW, 40);

    expect(lines.filter((line) => line.tone === 'offer')).toHaveLength(1);
  });

  it('extends nothing where the machine offers nothing', () => {
    expect(textOf().some((line) => line.includes('press '))).toBe(false);
  });
});
