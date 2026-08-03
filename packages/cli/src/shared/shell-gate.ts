import type { ItemStatus } from './item.ts';
import type { Verdict } from './verdict.ts';
import type { GovernedItem } from './write-gate.ts';

import { publishesWork } from './publish.ts';
import { ALLOWED } from './verdict.ts';
import { jobIn, verdictFor } from './write-gate.ts';

const SKIPS_A_GATE = ['--no-verify', '--no-gpg-sign'];

export interface CommandAttempt {
  command: string;
  written: string[];
  sources: string[];
  adapters: string[];
  lockfile: string;
  inFlight: GovernedItem[];
  reviewed: string[];
}

function skipping(command: string): Verdict | undefined {
  const found = SKIPS_A_GATE.find((flag) => command.includes(flag));

  if (found === undefined) {
    return undefined;
  }

  return {
    refused: `${found} skips a gate. Fix what the gate found rather than stepping around it.`,
  };
}

// A shell can write any file the Write tool can, so the same rule decides both.
// A second copy of the rule here would be a second answer to the same question.
function writing(attempt: CommandAttempt): Verdict | undefined {
  for (const path of attempt.written) {
    const verdict = verdictFor({
      path,
      sources: attempt.sources,
      adapters: attempt.adapters,
      lockfile: attempt.lockfile,
      inFlight: attempt.inFlight,
    });

    if ('refused' in verdict) {
      return { refused: `this command writes ${path}. ${verdict.refused}` };
    }
  }

  return undefined;
}

export function unreadableVerdict(part: string): Verdict {
  return {
    refused: `ket cannot read what this command writes, because of ${part}. Write the file with the Write tool so a gate can judge it.`,
  };
}

// A review answers for source, and source arrives at implementing. Before that
// there is nothing to have reviewed, so a push carries no unanswered work.
const CARRIES_SOURCE: ItemStatus[] = ['implementing', 'verifying', 'awaiting-merge'];

// Mutation gates the transition and the review does not, but work does not
// reach anybody else until somebody has answered for it. A skip is an answer.
function unreviewed(attempt: CommandAttempt): Verdict | undefined {
  const working = jobIn(attempt.inFlight);

  if (working === undefined || !publishesWork(attempt.command)) {
    return undefined;
  }

  if (!CARRIES_SOURCE.includes(working.status)) {
    return undefined;
  }

  if (attempt.reviewed.includes(working.key)) {
    return undefined;
  }

  return {
    refused: `this command publishes ${working.key} and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip ${working.key} --reason.`,
  };
}

export function shellVerdict(attempt: CommandAttempt): Verdict {
  return skipping(attempt.command) ?? writing(attempt) ?? unreviewed(attempt) ?? ALLOWED;
}
