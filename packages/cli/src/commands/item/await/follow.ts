import { watch } from 'node:fs';
import { appendFile, utimes } from 'node:fs/promises';
import { join } from 'node:path';

import { readLog } from '../../../shared/event-log.ts';
import { readEvents } from '../../../shared/log-lines.ts';
import { read } from '../store.ts';
import { departureAmong } from './departure.ts';

const NUDGE_EVERY_MS = 25;

function eventLogIn(root: string): string {
  return join(root, '.ket', 'events.jsonl');
}

interface Looked {
  to: string | undefined;
  seen: number;
}

async function baselineOf(root: string, key: string, from: string): Promise<Looked> {
  const seen = readEvents(await readLog(root)).length;
  const item = await read(root, key);

  return { to: item.status === from ? undefined : item.status, seen };
}

async function scanOf(root: string, key: string, from: string, offset: number): Promise<Looked> {
  const events = readEvents(await readLog(root));

  return { to: departureAmong(events.slice(offset), key, from), seen: events.length };
}

function followingTheLog(
  root: string,
  key: string,
  from: string,
  resolve: (to: string) => void,
  reject: (refusal: Error) => void,
): void {
  const logPath = eventLogIn(root);
  let seen: number | undefined;
  let turns: Promise<void> = Promise.resolve();

  const watcher = watch(logPath, () => {
    turns = turns.then(onSignal).catch(fail);
  });
  const nudging = setInterval(() => {
    void utimes(logPath, new Date(), new Date()).catch(fail);
  }, NUDGE_EVERY_MS);

  function close(): void {
    watcher.close();
    clearInterval(nudging);
  }

  function fail(cause: unknown): void {
    close();
    const said = cause instanceof Error ? cause.message : String(cause);

    reject(new Error(`waiting on ${key} failed while following ${logPath}: ${said}`));
  }

  async function looked(): Promise<Looked> {
    if (seen !== undefined) {
      return scanOf(root, key, from, seen);
    }

    clearInterval(nudging);

    return baselineOf(root, key, from);
  }

  async function onSignal(): Promise<void> {
    const found = await looked();

    seen = found.seen;

    if (found.to !== undefined) {
      close();
      resolve(found.to);
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
