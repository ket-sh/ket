import type { Item, ItemStatus } from './item.ts';

export type Approval = { approved: Item } | { refused: string };

// Total over every status, so adding one to the lifecycle forces a decision
// here rather than falling through to a default nobody chose.
const WHY_NOT: Record<ItemStatus, string | undefined> = {
  idea: 'still an idea, so triage runs first',
  triaged: undefined,
  designing: 'still designing, so its artifacts are not written yet',
  'awaiting-approval': undefined,
  implementing: 'already implementing',
  verifying: 'already verifying',
  shipped: 'already shipped',
};

export function approvalOf(item: Item): Approval {
  const refused = WHY_NOT[item.status];

  return refused === undefined ? { approved: { ...item, status: 'implementing' } } : { refused };
}
