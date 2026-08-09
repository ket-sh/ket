import type { JourneyView } from '../../../shared/model';

export const NARRATED = {
  text: 'researching the breakdown',
  actor: 'decomposer',
  at: '2026-08-07T11:30:00.000Z',
};

const DESCRIBED = [
  'The keeper locks the account after five failures.',
  '## Acceptance',
  'The keeper **counts** each failure and clears the tally on success.',
  ...Array.from({ length: 30 }, (_, held) => `over ${String(held + 1).padStart(2, '0')}`),
].join('\n\n');

export const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: DESCRIBED,
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
      steps: [],
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
      steps: [{ name: 'spec.md', at: '2026-08-07T11:00:00.000Z' }],
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
      steps: [],
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
    {
      path: '.ket/items/K-1/notes.md',
      name: 'notes.md',
      at: undefined,
      doc: {
        kind: 'prose',
        label: 'Notes',
        tech: Array.from(
          { length: 40 },
          (_, held) => `line ${String(held + 1).padStart(2, '0')}`,
        ).join('\n'),
        plain: undefined,
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
    offers: [],
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
      steps: [],
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
    offers: ['approve'],
  },
};
