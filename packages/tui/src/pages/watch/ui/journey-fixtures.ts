import type { JourneyView } from '../../../shared/model';

export const NARRATED = {
  text: 'researching the breakdown',
  actor: 'decomposer',
  at: '2026-08-07T11:30:00.000Z',
};

export const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: 'The keeper locks the account after five failures.',
  nodes: [
    {
      id: 'triaged',
      title: 'triaged',
      state: 'done',
      refusal: undefined,
      at: '2026-08-07T09:00:00.000Z',
      until: '2026-08-07T10:00:00.000Z',
      note: undefined,
      doc: undefined,
    },
    {
      id: 'designing',
      title: 'designing',
      state: 'running',
      refusal: undefined,
      at: '2026-08-07T10:00:00.000Z',
      until: undefined,
      note: NARRATED,
      doc: undefined,
    },
    {
      id: 'awaiting-approval',
      title: 'awaiting-approval',
      state: 'future',
      refusal: undefined,
      at: undefined,
      until: undefined,
      note: undefined,
      doc: undefined,
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'awaiting-approval'],
  ],
  standing: 'no failing test covers it',
  artifacts: [
    {
      path: '.ket/items/K-1/spec.md',
      name: 'spec.md',
      at: '2026-08-07T11:00:00.000Z',
      doc: {
        kind: 'prose',
        label: 'Spec',
        tech: 'Five failures lock the account.',
        plain: 'Five tries and you wait.',
        note: undefined,
      },
    },
  ],
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
    status: 'designing',
    stageAt: 3,
    stageOf: 8,
    parent: undefined,
    refusedTimes: 1,
    arrivedAt: '2026-08-07T10:00:00.000Z',
    lastEventAt: '2026-08-07T10:30:00.000Z',
    filed: { by: 'Ada Lovelace', at: '2026-08-07T08:00:00.000Z' },
    branch: { name: 'feat/watched', commits: 4 },
    note: NARRATED,
  },
};

export const CHILD_JOURNEY: JourneyView = {
  item: 'K-2',
  title: 'A quiet fix',
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
  artifacts: [
    {
      path: '.ket/items/K-2/locking.feature',
      name: 'locking.feature',
      at: undefined,
      doc: {
        kind: 'criteria',
        label: 'Criteria',
        name: 'locking.feature',
        source: 'Feature: locking\n  Scenario: five tries',
      },
    },
  ],
  children: [],
  pane: {
    kind: 'chore',
    size: 'subtask',
    status: 'triaged',
    stageAt: 2,
    stageOf: 8,
    parent: 'K-1',
    refusedTimes: 0,
    arrivedAt: undefined,
    lastEventAt: undefined,
    filed: undefined,
    branch: undefined,
    note: undefined,
  },
};
