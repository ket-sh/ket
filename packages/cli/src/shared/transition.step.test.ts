import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Item, ItemStatus } from './item.ts';
import type { Stage, Transition } from './transition.ts';

import { ITEM_SIZES, ITEM_STATUSES } from './item.ts';
import {
  approvalOf,
  deliveryOf,
  designOf,
  machineStepOf,
  shipmentOf,
  submissionOf,
  verificationOf,
} from './transition.ts';

const MOVED_BY: Record<string, (item: Item) => Transition> = {
  'ket item design': designOf,
  'ket item submit': submissionOf,
  'ket item verify': (item) => verificationOf(item, []),
  'ket item deliver': (item) => deliveryOf(item, []),
};

const SETTLED: ItemStatus[] = ['idea', 'shipped'];

const anyStage: fc.Arbitrary<Stage> = fc.record({
  status: fc.constantFrom(...ITEM_STATUSES),
  size: fc.constantFrom(...ITEM_SIZES),
});

function itemAt(stage: Stage): Item {
  return {
    title: 'login with lockout',
    kind: 'feature',
    size: stage.size,
    status: stage.status,
    parent: undefined,
    children: [],
  };
}

function moves(transition: Transition): boolean {
  return 'moved' in transition;
}

function runningTheNamedStep(stage: Stage): Transition {
  const step = machineStepOf(stage);
  const move = step === undefined ? undefined : MOVED_BY[step];

  return move === undefined ? { refused: 'no command by that name' } : move(itemAt(stage));
}

function aPersonEnds(stage: Stage): boolean {
  const item = itemAt(stage);
  const decomposing = stage.status === 'designing' && stage.size === 'epic';

  return (
    moves(approvalOf(item)) ||
    moves(shipmentOf(item)) ||
    decomposing ||
    SETTLED.includes(stage.status)
  );
}

describe('the command a status still owes the machine', () => {
  it('sends a triaged story to design, since work that size never skips it', () => {
    expect(machineStepOf({ status: 'triaged', size: 'story' })).toBe('ket item design');
  });

  it('sends a triaged epic to design as well', () => {
    expect(machineStepOf({ status: 'triaged', size: 'epic' })).toBe('ket item design');
  });

  it('sends a designing story to submission, so a person can approve it', () => {
    expect(machineStepOf({ status: 'designing', size: 'story' })).toBe('ket item submit');
  });

  it('sends a designing subtask to submission, since design stays open at every size', () => {
    expect(machineStepOf({ status: 'designing', size: 'subtask' })).toBe('ket item submit');
  });

  it('sends implementing work to verification', () => {
    expect(machineStepOf({ status: 'implementing', size: 'story' })).toBe('ket item verify');
  });

  it('sends verifying work to delivery', () => {
    expect(machineStepOf({ status: 'verifying', size: 'story' })).toBe('ket item deliver');
  });
});

describe('the statuses only a person ends', () => {
  it('owes nothing at a triaged subtask, since approval is the next move', () => {
    expect(machineStepOf({ status: 'triaged', size: 'subtask' })).toBeUndefined();
  });

  it('owes nothing at a triaged trivial item, for the same reason', () => {
    expect(machineStepOf({ status: 'triaged', size: 'trivial' })).toBeUndefined();
  });

  it('owes nothing at a designing epic, since the user picks its children', () => {
    expect(machineStepOf({ status: 'designing', size: 'epic' })).toBeUndefined();
  });

  it('owes nothing while an item awaits approval', () => {
    expect(machineStepOf({ status: 'awaiting-approval', size: 'story' })).toBeUndefined();
  });

  it('owes nothing while an item awaits its merge', () => {
    expect(machineStepOf({ status: 'awaiting-merge', size: 'story' })).toBeUndefined();
  });

  it('owes nothing on an idea, which waits for somebody to pick it up', () => {
    expect(machineStepOf({ status: 'idea', size: 'story' })).toBeUndefined();
  });

  it('owes nothing on work that shipped', () => {
    expect(machineStepOf({ status: 'shipped', size: 'story' })).toBeUndefined();
  });
});

describe('what the named command does when it runs', () => {
  it('never names a command the item would refuse', () => {
    fc.assert(
      fc.property(anyStage, (stage) => {
        fc.pre(machineStepOf(stage) !== undefined);

        expect(moves(runningTheNamedStep(stage))).toBe(true);
      }),
    );
  });

  it('names nothing only where a person is the one who moves it on', () => {
    fc.assert(
      fc.property(anyStage, (stage) => {
        fc.pre(machineStepOf(stage) === undefined);

        expect(aPersonEnds(stage)).toBe(true);
      }),
    );
  });
});
