import type { GateEvent } from './event.ts';

const UNEXPLAINED = 'a skipped review records why. Pass --reason with what made it safe to skip.';

export interface ReviewRecord {
  key: string;
  reason: string | undefined;
}

export type ReviewOutcome = GateEvent | { refused: string };

// A skip is allowed and a skip nobody can see is not. What the log carries is
// the reason, because that is the only part a reader can judge afterwards.
export function reviewEventFor(record: ReviewRecord): ReviewOutcome {
  if (record.reason === undefined) {
    return { gate: 'review', outcome: 'allowed', about: record.key, item: record.key };
  }

  if (record.reason.trim() === '') {
    return { refused: UNEXPLAINED };
  }

  return {
    gate: 'review',
    outcome: 'skipped',
    about: record.key,
    item: record.key,
    reason: record.reason,
  };
}
