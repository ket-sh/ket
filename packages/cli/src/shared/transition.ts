import type { Item, ItemSize, ItemStatus } from './item.ts';

export type Transition = { moved: Item } | { refused: string };

// Total over every status, so adding one to the lifecycle forces a decision on
// every stage rather than falling through to a default nobody chose.
type Refusals = Record<ItemStatus, string | undefined>;

const WHY_NOT_DESIGN: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: undefined,
  designing: 'already designing',
  'awaiting-approval': 'already designed, so approval comes next',
  implementing: 'already implementing',
  verifying: 'already verifying',
  shipped: 'already shipped',
};

const WHY_NOT_SUBMIT: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: 'not designed yet, so design runs first',
  designing: undefined,
  'awaiting-approval': 'already awaiting approval',
  implementing: 'already implementing',
  verifying: 'already verifying',
  shipped: 'already shipped',
};

const WHY_NOT_APPROVE: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: undefined,
  designing: 'still designing, so its artifacts are not written yet',
  'awaiting-approval': undefined,
  implementing: 'already implementing',
  verifying: 'already verifying',
  shipped: 'already shipped',
};

const OWES_DESIGN: ItemSize[] = ['epic', 'story'];

function moveTo(item: Item, status: ItemStatus, whyNot: Refusals): Transition {
  const refused = whyNot[item.status];

  return refused === undefined ? { moved: { ...item, status } } : { refused };
}

export function designOf(item: Item): Transition {
  return moveTo(item, 'designing', WHY_NOT_DESIGN);
}

export function submissionOf(item: Item): Transition {
  return moveTo(item, 'awaiting-approval', WHY_NOT_SUBMIT);
}

function designOwedBy(item: Item): string | undefined {
  if (item.status !== 'triaged' || !OWES_DESIGN.some((size) => size === item.size)) {
    return undefined;
  }

  return `not designed yet, and ${item.size} work does not skip design`;
}

export function approvalOf(item: Item): Transition {
  const owed = designOwedBy(item);

  return owed === undefined ? moveTo(item, 'implementing', WHY_NOT_APPROVE) : { refused: owed };
}
