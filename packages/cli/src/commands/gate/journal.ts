import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Denial } from './envelope.ts';
import type { GateEvent } from './event.ts';

import { KET_DIRECTORY } from '../../shared/locate.ts';
import { renderEvent } from './event.ts';

const EVENTS = 'events.jsonl';

export function eventFor(
  gate: GateEvent['gate'],
  about: string,
  denial: Denial | undefined,
  item?: string,
): GateEvent {
  return {
    gate,
    outcome: denial === undefined ? 'allowed' : 'refused',
    about,
    ...(item === undefined ? {} : { item }),
    ...(denial === undefined ? {} : { reason: denial.hookSpecificOutput.permissionDecisionReason }),
  };
}

export async function record(root: string, event: GateEvent): Promise<void> {
  await appendFile(join(root, KET_DIRECTORY, EVENTS), renderEvent(event), 'utf8');
}
