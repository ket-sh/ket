import { describe, expect, it } from 'vitest';

import type {
  JourneyArtifactView,
  JourneyChildView,
  JourneyPaneView,
  JourneyView,
} from '../../../shared/model';

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

function childOf(key: string, status: string): JourneyChildView {
  return { key, title: 'a child', size: 'story', status, since: undefined, refusal: undefined };
}

function artifactOf(name: string): JourneyArtifactView {
  return { path: `.ket/items/K-1/${name}`, name, at: undefined, doc: undefined };
}

interface Amended {
  pane?: Partial<JourneyPaneView>;
  title?: string;
  standing?: string;
  children?: JourneyChildView[];
  artifacts?: JourneyArtifactView[];
}

function journeyOf(amended: Amended = {}): JourneyView {
  return {
    item: 'K-1',
    title: amended.title ?? 'The watched item',
    description: undefined,
    nodes: [],
    edges: [],
    standing: amended.standing,
    artifacts: amended.artifacts ?? [],
    children: amended.children ?? [],
    pane: { ...FACTS, ...amended.pane },
  };
}

function textOf(amended: Amended = {}, room = 30): string[] {
  return paneLinesOf(journeyOf(amended), NOW, room).map((line) => line.text);
}

describe('the name the pane leads with', () => {
  it('leads with the key and suffixes the kind and the size', () => {
    expect(textOf()[0]).toBe('K-1  bug · story');
  });

  it('spells the title over its own lines under the key', () => {
    expect(textOf({ title: 'The watched item' })[1]).toBe('The watched item');
  });

  it('wraps a long title rather than cutting it down to one line', () => {
    const lines = textOf({ title: 'a title far too long to sit on any single narrow line' }, 20);

    expect(lines.slice(1, 4)).toStrictEqual([
      'a title far too long',
      'to sit on any single',
      'narrow line',
    ]);
  });

  it('never gives a title more than three lines', () => {
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    const lines = paneLinesOf(journeyOf({ title: long }), NOW, 12);

    expect(lines.filter((line) => line.tone === 'title')).toHaveLength(3);
  });
});

describe('the state the pane reports', () => {
  it('says the status and where it sits on the machine path', () => {
    expect(textOf()).toContain('designing · stage 3 of 8');
  });

  it('says how long the item has held its stage', () => {
    expect(textOf()).toContain('in stage 12m');
  });

  it('says how long ago the log last heard from the item', () => {
    expect(textOf()).toContain('last event 9m ago');
  });

  it('says nothing about a stage the item has never been dated into', () => {
    const lines = textOf({ pane: { arrivedAt: undefined, lastEventAt: undefined } });

    expect(lines.some((line) => line.startsWith('in stage'))).toBe(false);
    expect(lines.some((line) => line.startsWith('last event'))).toBe(false);
  });
});

describe('the alert the pane raises', () => {
  it('raises nothing while no gate has turned the work away', () => {
    expect(textOf().some((line) => line.startsWith('refused'))).toBe(false);
  });

  it('counts the refusals and carries the last reason beside the count', () => {
    const lines = textOf({ pane: { refusedTimes: 3 }, standing: 'no test covers it' }, 40);

    expect(lines).toContain('refused 3x  no test covers it');
  });

  it('marks the refusal line so it can wear the alert color', () => {
    const lines = paneLinesOf(
      journeyOf({ pane: { refusedTimes: 1 }, standing: 'no test covers it' }),
      NOW,
      40,
    );

    expect(lines.filter((line) => line.tone === 'alert')).toHaveLength(1);
  });
});

describe('the provenance the pane borrows from the repository', () => {
  it('says who filed the item and how long ago', () => {
    const filed = { by: 'Ada Lovelace', at: '2026-08-07T10:00:00.000Z' };

    expect(textOf({ pane: { filed } }, 40)).toContain('filed by Ada Lovelace · 2h ago');
  });

  it('omits the filing line when the repository yields nothing', () => {
    expect(textOf().some((line) => line.startsWith('filed by'))).toBe(false);
  });

  it('names the branch and how many commits it holds', () => {
    const branch = { name: 'feat/watched', commits: 4 };

    expect(textOf({ pane: { branch } }, 40)).toContain('feat/watched · 4 commits');
  });

  it('names a branch holding one commit in the singular', () => {
    const branch = { name: 'feat/watched', commits: 1 };

    expect(textOf({ pane: { branch } }, 40)).toContain('feat/watched · 1 commit');
  });

  it('omits the branch line when nothing derives one', () => {
    expect(textOf().some((line) => line.includes('commit'))).toBe(false);
  });
});

describe('the family the pane points at', () => {
  it('hides the parent line for an item filed on its own', () => {
    expect(textOf().some((line) => line.startsWith('parent'))).toBe(false);
  });

  it('names the parent the item hangs under', () => {
    expect(textOf({ pane: { parent: 'K-9' } })).toContain('parent K-9');
  });

  it('sums the children into one line of shipped over total', () => {
    const children = [
      childOf('K-2', 'shipped'),
      childOf('K-3', 'shipped'),
      childOf('K-4', 'designing'),
    ];

    expect(textOf({ children })).toContain('children 2/3 shipped');
  });

  it('hides the children line for an item with none', () => {
    expect(textOf().some((line) => line.startsWith('children'))).toBe(false);
  });

  it('marks the children line as the one the pane can jump from', () => {
    const lines = paneLinesOf(journeyOf({ children: [childOf('K-2', 'shipped')] }), NOW, 30);

    expect(lines.filter((line) => line.tone === 'link')).toHaveLength(1);
  });
});

describe('the narration the pane speaks for the step at work', () => {
  const note = {
    text: 'researching the breakdown',
    actor: 'decomposer',
    at: '2026-08-07T11:30:00.000Z',
  };

  it('says what is happening in its own line', () => {
    expect(textOf({ pane: { note } }, 40)).toContain('researching the breakdown');
  });

  it('attributes the words to their author and their moment', () => {
    expect(textOf({ pane: { note } }, 40)).toContain('by decomposer · 30m ago');
  });

  it('says nothing where no step said anything', () => {
    expect(textOf().some((line) => line.startsWith('by '))).toBe(false);
  });
});

describe('the artifacts the pane lists', () => {
  it('names the files the item wrote by their basenames', () => {
    const artifacts = [artifactOf('design.md'), artifactOf('criteria.feature')];

    expect(textOf({ artifacts }, 40)).toContain('artifacts design.md, criteria.feature');
  });

  it('hides the artifacts line for an item that wrote nothing', () => {
    expect(textOf().some((line) => line.startsWith('artifacts'))).toBe(false);
  });
});

describe('the width the pane never paints past', () => {
  it('clips every line to the column it was given', () => {
    const lines = paneLinesOf(
      journeyOf({
        title: 'a title far too long for this narrow pane to ever hold',
        artifacts: [artifactOf('a-very-long-artifact-name.md')],
        pane: { branch: { name: 'feat/an-extremely-long-branch-name', commits: 12 } },
      }),
      NOW,
      16,
    );

    for (const line of lines) {
      expect(line.text.length).toBeLessThanOrEqual(16);
    }
  });
});
