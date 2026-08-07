import type { Item, ItemStatus } from './item.ts';
import type { GateAction, Transition } from './transition.ts';

import { record } from './event-log.ts';
import { read, readStored, write } from './item-store.ts';
import { inFlightFrom } from './read-item.ts';
import { approvalOf, reopeningOf, shipmentOf } from './transition.ts';
import { secondJobAmong } from './write-gate.ts';

export type Moved = { moved: ItemStatus } | { refused: string };

export type Decision = (item: Item, root: string, key: string) => Promise<Transition>;

export function byStatus(move: (item: Item) => Transition): Decision {
  return async (item) => Promise.resolve(move(item));
}

// Refusing here beats hearing it from the write gate one edit into the job.
export function whileNothingElseWorks(move: (item: Item) => Transition): Decision {
  return async (item, root, key) => {
    const opened = move(item);

    if ('refused' in opened) {
      return opened;
    }

    const held = secondJobAmong(inFlightFrom(await readStored(root)), key);

    if (held !== undefined) {
      return {
        refused: `waiting its turn: ${held.key} is the job in hand, and one job means one branch`,
      };
    }

    return opened;
  };
}

const GATE_DECISIONS: Record<GateAction, Decision> = {
  approve: whileNothingElseWorks(approvalOf),
  ship: byStatus(shipmentOf),
  reopen: byStatus(reopeningOf),
};

export function decisionOf(gate: GateAction): Decision {
  return GATE_DECISIONS[gate];
}

export async function moveThrough(
  root: string,
  key: string,
  name: string,
  decide: Decision,
): Promise<Moved> {
  const outcome = await decide(await read(root, key), root, key);

  if ('refused' in outcome) {
    await record(root, {
      gate: 'transition',
      outcome: 'refused',
      about: name,
      item: key,
      reason: outcome.refused,
    });

    return outcome;
  }

  await write(root, key, outcome.moved);
  await record(root, {
    gate: 'transition',
    outcome: 'allowed',
    about: outcome.moved.status,
    item: key,
  });

  return { moved: outcome.moved.status };
}
