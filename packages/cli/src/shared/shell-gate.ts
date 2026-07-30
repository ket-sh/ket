import type { Verdict } from './verdict.ts';

import { ALLOWED } from './verdict.ts';

const SKIPS_A_GATE = ['--no-verify', '--no-gpg-sign'];

export function shellVerdict(command: string): Verdict {
  const found = SKIPS_A_GATE.find((flag) => command.includes(flag));

  if (found === undefined) {
    return ALLOWED;
  }

  return {
    refused: `${found} skips a gate. Fix what the gate found rather than stepping around it.`,
  };
}
