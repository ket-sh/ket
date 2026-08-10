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

export async function confirmedByKnocking(
  observed: Promise<void>,
  knock: () => Promise<void>,
  boundMs: number,
): Promise<boolean> {
  const deadline = Date.now() + boundMs;

  for (let left = boundMs; left > 0; left = deadline - Date.now()) {
    await knock();

    if (await watchConfirmed(observed, Math.min(ARMING_KNOCK_MS, left))) {
      return true;
    }
  }

  return false;
}

async function knockedFresh(sentinel: string): Promise<void> {
  await rm(sentinel, { force: true });
  await writeFile(sentinel, '');
}

async function knockUntilWatching(
  itemDir: string,
  observed: Promise<void>,
  boundMs: number,
): Promise<void> {
  const sentinel = join(itemDir, ARMING_SENTINEL);
  let confirmed = false;

  try {
    confirmed = await confirmedByKnocking(
      observed,
      async () => {
        await knockedFresh(sentinel);
      },
      boundMs,
    );
  } finally {
    await rm(sentinel, { force: true });
  }

  if (!confirmed) {
    throw new Error(
      `the surface could not confirm it is watching ${itemDir} within ${String(boundMs)}ms`,
    );
  }
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
