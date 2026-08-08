import type { GateSemantics } from '@ket/preset';

import type { DeclaredGateEvent } from './event.ts';

import { segmentsIn } from './command-writes.ts';

const RUNNER = 'bun';

const RUN = 'run';

const FLAG = '-';

function scriptRunIn(segment: string[]): string | undefined {
  const [runner, subcommand, ...called] = segment;

  if (runner !== RUNNER || subcommand !== RUN) {
    return undefined;
  }

  return called.find((word) => !word.startsWith(FLAG));
}

// The preset already names its gates, so the log speaks those names by reading
// them off the declaration rather than keeping a second list beside it.
export function declaredGatesRunBy(command: string, gates: GateSemantics[]): string[] {
  const declared = new Set(gates.map((gate) => gate.script));
  const run = segmentsIn(command)
    .map((segment) => scriptRunIn(segment))
    .filter((script): script is string => script !== undefined && declared.has(script));

  return [...new Set(run)];
}

// A declared run only ever records an allowance: a refused command never ran
// the script, and a refused line under the declared name would count the same
// refusal twice in a retro, once for the shell gate and once for the script.
export function declaredGateEventFor(script: string, command: string): DeclaredGateEvent {
  return { gate: script, outcome: 'allowed', about: command };
}
