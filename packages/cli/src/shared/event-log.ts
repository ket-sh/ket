import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DeclaredGateEvent, GateEvent, NoteEvent } from './event.ts';

import { renderEvent } from './event.ts';

const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

function logIn(root: string): string {
  return join(root, KET_DIRECTORY, EVENTS);
}

export async function readLog(root: string): Promise<string> {
  return readFile(logIn(root), 'utf8').catch(() => '');
}

export async function record(
  root: string,
  event: DeclaredGateEvent | GateEvent | NoteEvent,
  at = new Date().toISOString(),
): Promise<void> {
  await appendFile(logIn(root), renderEvent({ ...event, at }), 'utf8');
}
