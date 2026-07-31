import type { GateEvent } from './event.ts';
import type { GovernedItem } from './write-gate.ts';

import { standingOf } from './turn-gate.ts';

export type RestOutcome = GateEvent | { refused: string };

export interface RestRequest {
  key: string;
  reason: string;
  job: GovernedItem | undefined;
}

const UNEXPLAINED =
  'a deliberate stop records why. Pass --reason with what the work is waiting on.';

// A stop a person asks for is theirs to ask for, and a stop nobody can weigh
// afterwards is the same as no gate at all. The reason is the only part a
// reader can judge later, so it is the part ket refuses to do without.
export function restEventFor(request: RestRequest): RestOutcome {
  const { job } = request;

  if (job === undefined) {
    return { refused: `nothing is in flight, so there is no stop for ${request.key} to record.` };
  }

  if (job.key !== request.key) {
    return { refused: `${job.key} is the item in flight, not ${request.key}.` };
  }

  if (request.reason.trim() === '') {
    return { refused: UNEXPLAINED };
  }

  return {
    gate: 'turn',
    outcome: 'skipped',
    about: standingOf(job),
    item: request.key,
    reason: request.reason,
  };
}
