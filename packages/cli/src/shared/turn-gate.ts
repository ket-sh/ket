import type { GateEvent } from './event.ts';
import type { GovernedItem } from './write-gate.ts';

import { machineStepOf } from './transition.ts';

export type Turn = { refused: string } | { allowed: string };

export interface StopAttempt {
  job: GovernedItem;
  overridden: boolean;
  refusals: number;
  rested: boolean;
}

// The runtime overrides a stop hook after eight blocks in a row, so ket lets go
// well before that. Three refusals at one stage means three instructions the
// item did not answer, and a fourth would be repetition rather than a gate.
const STUCK = 3;

const OVERRIDDEN = 'the runtime had already overridden the stop hook';

const RESTED = 'a person recorded a deliberate stop at this stage';

export function standingOf(job: GovernedItem): string {
  return `${job.key} ${job.status}`;
}

function stuck(attempt: StopAttempt): string | undefined {
  if (attempt.refusals < STUCK) {
    return undefined;
  }

  return `ket refused this stop ${String(attempt.refusals)} times and ${attempt.job.key} did not move`;
}

function letGo(attempt: StopAttempt): string | undefined {
  if (attempt.overridden) {
    return OVERRIDDEN;
  }

  return attempt.rested ? RESTED : stuck(attempt);
}

function instruction(job: GovernedItem, step: string): string {
  return `${job.key} is ${job.status}, not at a stopping place. Run ${step} ${job.key}, or record a deliberate stop with ket turn rest ${job.key} --reason.`;
}

export function turnFor(attempt: StopAttempt): Turn {
  const released = letGo(attempt);

  if (released !== undefined) {
    return { allowed: released };
  }

  const step = machineStepOf(attempt.job);

  if (step === undefined) {
    return { allowed: `${attempt.job.key} is ${attempt.job.status}, which waits for a person` };
  }

  return { refused: instruction(attempt.job, step) };
}

// Every decision about a stop is recorded, refusal or not. The bound reads that
// history back, and a reader weighs what let ket go from the same lines.
export function turnEventFor(job: GovernedItem, turn: Turn): GateEvent {
  return {
    gate: 'turn',
    outcome: 'refused' in turn ? 'refused' : 'allowed',
    about: standingOf(job),
    item: job.key,
    reason: 'refused' in turn ? turn.refused : turn.allowed,
  };
}
