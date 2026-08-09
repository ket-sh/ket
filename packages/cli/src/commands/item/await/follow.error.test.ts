import type { FSWatcher, WatchListener } from 'node:fs';

import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as settling } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { departureFrom } from './follow.ts';

class BreakableWatcher extends EventEmitter implements FSWatcher {
  close(): void {
    this.removeAllListeners();
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }
}

const watching = vi.hoisted((): { broken: EventEmitter | undefined } => ({ broken: undefined }));

vi.mock('node:fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs')>();
  const watch = (path: string, listener: WatchListener<string>): FSWatcher =>
    watching.broken instanceof BreakableWatcher ? watching.broken : real.watch(path, listener);

  return { ...real, watch };
});

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-await-error-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched work\nkind: feature\nsize: story\nstatus: awaiting-approval\nchildren: []\n',
  );
});

afterEach(async () => {
  watching.broken = undefined;
  await rm(root, { recursive: true, force: true });
});

async function armed(broken: EventEmitter): Promise<void> {
  const deadline = Date.now() + 200;

  while (broken.listenerCount('error') === 0 && Date.now() < deadline) {
    await settling(5);
  }
}

describe('a watcher the platform breaks mid-wait', () => {
  it('rejects with the story instead of crashing', async () => {
    const broken = new BreakableWatcher();

    watching.broken = broken;

    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await armed(broken);
    broken.emit('error', new Error('the disk fell over'));

    await expect(departed).rejects.toThrow('waiting on K-1 failed while following');
  });
});
