import type { Item, ItemSize, ItemStatus } from './item.ts';
import type { RingFailure } from './ring.ts';

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
  'awaiting-merge': 'already awaiting merge',
  shipped: 'already shipped',
};

const WHY_NOT_SUBMIT: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: 'not designed yet, so design runs first',
  designing: undefined,
  'awaiting-approval': 'already awaiting approval',
  implementing: 'already implementing',
  verifying: 'already verifying',
  'awaiting-merge': 'already awaiting merge',
  shipped: 'already shipped',
};

const WHY_NOT_APPROVE: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: undefined,
  designing: 'still designing, so its artifacts are not written yet',
  'awaiting-approval': undefined,
  implementing: 'already implementing',
  verifying: 'already verifying',
  'awaiting-merge': 'already awaiting merge',
  shipped: 'already shipped',
};

const WHY_NOT_VERIFY: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: 'not implementing yet, so approval runs first',
  designing: 'still designing, so there is nothing to verify',
  'awaiting-approval': 'awaiting approval, so there is nothing to verify',
  implementing: undefined,
  verifying: 'already verifying',
  'awaiting-merge': 'already verified, so the merge comes next',
  shipped: 'already shipped',
};

const WHY_NOT_DELIVER: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: 'not verified yet, so implementation runs first',
  designing: 'still designing, so nothing is verified',
  'awaiting-approval': 'awaiting approval, so nothing is verified',
  implementing: 'still implementing, so verification runs first',
  verifying: undefined,
  'awaiting-merge': 'already awaiting merge',
  shipped: 'already shipped',
};

const WHY_NOT_SHIP: Refusals = {
  idea: 'still an idea, so triage runs first',
  triaged: 'not implemented yet, so nothing has merged',
  designing: 'still designing, so nothing has merged',
  'awaiting-approval': 'awaiting approval, so nothing has merged',
  implementing: 'still implementing, so verification runs first',
  verifying: 'still verifying, so the mutation gate runs first',
  'awaiting-merge': undefined,
  shipped: 'already shipped',
};

const OWES_DESIGN: ItemSize[] = ['epic', 'story'];

const DECOMPOSES: ItemSize = 'epic';

export interface Stage {
  status: ItemStatus;
  size: ItemSize;
}

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

function designOwedBy(stage: Stage): string | undefined {
  if (stage.status !== 'triaged' || !OWES_DESIGN.some((size) => size === stage.size)) {
    return undefined;
  }

  return `not designed yet, and ${stage.size} work does not skip design`;
}

export function approvalOf(item: Item): Transition {
  const owed = designOwedBy(item);

  return owed === undefined ? moveTo(item, 'implementing', WHY_NOT_APPROVE) : { refused: owed };
}

function toldBy(failures: RingFailure[]): string {
  return failures.map((failure) => `${failure.runs}\n${failure.said}`).join('\n\n');
}

function checked(moved: Transition, failures: RingFailure[], owing: string): Transition {
  if ('refused' in moved || failures.length === 0) {
    return moved;
  }

  return { refused: `${owing}\n\n${toldBy(failures)}` };
}

export function verificationOf(item: Item, failures: RingFailure[]): Transition {
  return checked(moveTo(item, 'verifying', WHY_NOT_VERIFY), failures, 'not ready to verify.');
}

export function deliveryOf(item: Item, failures: RingFailure[]): Transition {
  return checked(moveTo(item, 'awaiting-merge', WHY_NOT_DELIVER), failures, 'not verified yet.');
}

export function shipmentOf(item: Item): Transition {
  return moveTo(item, 'shipped', WHY_NOT_SHIP);
}

interface MachineStep {
  runs: string;
  whyNot: Refusals;
}

const MACHINE_STEPS: MachineStep[] = [
  { runs: 'ket item design', whyNot: WHY_NOT_DESIGN },
  { runs: 'ket item submit', whyNot: WHY_NOT_SUBMIT },
  { runs: 'ket item verify', whyNot: WHY_NOT_VERIFY },
  { runs: 'ket item deliver', whyNot: WHY_NOT_DELIVER },
];

function approvalMoves(stage: Stage): boolean {
  return designOwedBy(stage) === undefined && WHY_NOT_APPROVE[stage.status] === undefined;
}

function picksItsChildren(stage: Stage): boolean {
  return stage.status === 'designing' && stage.size === DECOMPOSES;
}

function waitsForAPerson(stage: Stage): boolean {
  return approvalMoves(stage) || picksItsChildren(stage);
}

export function machineStepOf(stage: Stage): string | undefined {
  if (waitsForAPerson(stage)) {
    return undefined;
  }

  return MACHINE_STEPS.find((step) => step.whyNot[stage.status] === undefined)?.runs;
}
