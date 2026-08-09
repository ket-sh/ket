import { watch } from 'node:fs';
import { appendFile, utimes } from 'node:fs/promises';
import { join } from 'node:path';

import type { LoggedEvent } from '../../../shared/log-lines.ts';

import { readLog } from '../../../shared/event-log.ts';
import { readEvents } from '../../../shared/log-lines.ts';
import { read } from '../store.ts';
import { departureAmong } from './departure.ts';

const NUDGE_EVERY_MS = 25;

function eventLogIn(root: string): string {
  return join(root, '.ket', 'events.jsonl');
}

function lastArrivalAt(events: LoggedEvent[], key: string, from: string): number {
  return events.findLastIndex(
    (event) =>
      event.gate === 'transition' &&
      event.outcome === 'allowed' &&
      event.item === key &&
      event.about === from,
  );
}

async function lookedFor(root: string, key: string, from: string): Promise<string | undefined> {
  const events = readEvents(await readLog(root));
  const item = await read(root, key);

  return item.status === from
    ? departureAmong(events.slice(lastArrivalAt(events, key, from) + 1), key, from)
    : item.status;
}

function followingTheLog(
  root: string,
  key: string,
  from: string,
  resolve: (to: string) => void,
  reject: (refusal: Error) => void,
): void {
  const logPath = eventLogIn(root);
  let turns: Promise<void> = Promise.resolve();

  const watcher = watch(logPath, () => {
    turns = turns.then(onSignal).catch(fail);
  });
  const nudging = setInterval(() => {
    void utimes(logPath, new Date(), new Date()).catch(fail);
  }, NUDGE_EVERY_MS);

  function fail(cause: unknown): void {
    watcher.close();
    clearInterval(nudging);
    const said = cause instanceof Error ? cause.message : String(cause);

    reject(new Error(`waiting on ${key} failed while following ${logPath}: ${said}`));
  }

  async function onSignal(): Promise<void> {
    clearInterval(nudging);

    const to = await lookedFor(root, key, from);

    if (to !== undefined) {
      watcher.close();
      resolve(to);
    }
  }

  watcher.on('error', fail);
}

export async function departureFrom(root: string, key: string, from: string): Promise<string> {
  await appendFile(eventLogIn(root), '', 'utf8');

  return new Promise((resolve, reject) => {
    followingTheLog(root, key, from, resolve, reject);
  });
}
