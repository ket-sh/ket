import type { GateEvent } from './event.ts';

import { renderEvent } from './event.ts';

const TURN: GateEvent['gate'] = 'turn';

const CLOSES = '}';

export interface TurnHistory {
  refusals: number;
  rested: boolean;
}

// A recorded line is matched by the opening the renderer writes, so the scan
// cannot drift from the writer. Everything a person supplies lands after it.
function opening(outcome: GateEvent['outcome'], standing: string): string {
  const rendered = renderEvent({ gate: TURN, outcome, about: standing });

  return rendered.slice(0, rendered.lastIndexOf(CLOSES));
}

export function turnHistoryIn(log: string, standing: string): TurnHistory {
  const lines = log.split('\n');
  const refused = opening('refused', standing);
  const rested = opening('skipped', standing);
  const allowed = opening('allowed', standing);
  const letGo = lines.findLastIndex((line) => line.startsWith(rested) || line.startsWith(allowed));

  return {
    refusals: lines.slice(letGo + 1).filter((line) => line.startsWith(refused)).length,
    rested: lines.some((line) => line.startsWith(rested)),
  };
}
