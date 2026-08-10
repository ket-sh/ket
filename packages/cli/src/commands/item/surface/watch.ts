import { once } from 'node:events';
import { watch } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface Watchdog {
  close: () => void;
  closed: Promise<unknown>;
}

const COALESCE_MS = 100;
const ARMING_KNOCK_MS = 20;
const ARMING_SENTINEL = '.surface-arming';

async function watchConfirmed(observed: Promise<void>, withinMs: number): Promise<boolean> {
  return Promise.race([
    observed.then(() => true),
    new Promise<boolean>((resolveUnconfirmed) => {
      setTimeout(() => {
        resolveUnconfirmed(false);
      }, withinMs);
    }),
  ]);
}

function racedByAForeignHand(thrown: unknown): boolean {
  return thrown instanceof Error && 'code' in thrown && thrown.code === 'EEXIST';
}

async function knockedFresh(sentinel: string): Promise<void> {
  await rm(sentinel, { force: true });

  try {
    await writeFile(sentinel, '', { flag: 'wx' });
  } catch (thrown) {
    if (!racedByAForeignHand(thrown)) {
      throw thrown;
    }
  }
}

async function knockUntilWatching(
  itemDir: string,
  observed: Promise<void>,
  boundMs: number,
): Promise<void> {
  const sentinel = join(itemDir, ARMING_SENTINEL);
  const deadline = Date.now() + boundMs;

  try {
    for (let left = boundMs; left > 0; left = deadline - Date.now()) {
      await knockedFresh(sentinel);

      if (await watchConfirmed(observed, Math.min(ARMING_KNOCK_MS, left))) {
        return;
      }
    }
  } finally {
    await rm(sentinel, { force: true });
  }

  throw new Error(
    `the surface could not confirm it is watching ${itemDir} within ${String(boundMs)}ms`,
  );
}

export async function watching(
  itemDir: string,
  changed: () => void,
  boundMs: number,
): Promise<Watchdog> {
  let pending: ReturnType<typeof setTimeout> | undefined;
  let confirm: (() => void) | undefined;

  const observed = new Promise<void>((resolveObserved) => {
    confirm = resolveObserved;
  });

  const watcher = watch(itemDir, { recursive: true }, (_, filename) => {
    confirm?.();

    if (typeof filename === 'string' && basename(filename).startsWith('.')) {
      return;
    }

    clearTimeout(pending);
    pending = setTimeout(changed, COALESCE_MS);
  });

  const watchdog: Watchdog = {
    closed: once(watcher, 'close'),
    close: () => {
      watcher.close();
    },
  };

  try {
    await knockUntilWatching(itemDir, observed, boundMs);
  } catch (failed) {
    watchdog.close();
    await watchdog.closed;

    throw failed;
  }

  return watchdog;
}
