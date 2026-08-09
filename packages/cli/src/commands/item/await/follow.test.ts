import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { departureFrom } from './follow.ts';

let root = '';

function itemFileOf(key: string): string {
  return join(root, '.ket', 'items', key, 'item.yaml');
}

function logFile(): string {
  return join(root, '.ket', 'events.jsonl');
}

async function filedAt(key: string, status: string): Promise<void> {
  await mkdir(join(root, '.ket', 'items', key), { recursive: true });
  await writeFile(
    itemFileOf(key),
    `title: The watched work\nkind: feature\nsize: story\nstatus: ${status}\nchildren: []\n`,
  );
}

async function recorded(event: object): Promise<void> {
  await appendFile(logFile(), `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
}

async function movedTo(key: string, status: string): Promise<void> {
  await filedAt(key, status);
  await recorded({ gate: 'transition', outcome: 'allowed', about: status, item: key });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-await-follow-'));
  await filedAt('K-1', 'awaiting-approval');
  await recorded({
    gate: 'transition',
    outcome: 'allowed',
    about: 'awaiting-approval',
    item: 'K-1',
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('following the log until the item leaves its status', () => {
  it('resolves with the status the item moved to once the log records the departure', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');

    await expect(departed).resolves.toBe('implementing');
  });

  it('resolves at once when the item left before the watch began', async () => {
    await movedTo('K-1', 'implementing');

    await expect(departureFrom(root, 'K-1', 'awaiting-approval')).resolves.toBe('implementing');
  });

  it('holds through noise and resolves on the real departure', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await recorded({ gate: 'transition', outcome: 'refused', about: 'approve', item: 'K-1' });
    await recorded({ note: 'reading the design', actor: 'implementer', item: 'K-1' });
    await movedTo('K-2', 'implementing');
    await movedTo('K-1', 'implementing');

    await expect(departed).resolves.toBe('implementing');
  });

  it('passes over the departures history already recorded', async () => {
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'triaged', item: 'K-1' });
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'designing', item: 'K-1' });

    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');

    await expect(departed).resolves.toBe('implementing');
  });

  it('watches a repository no gate wrote a log in yet', async () => {
    await rm(logFile());

    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');

    await expect(departed).resolves.toBe('implementing');
  });

  it('rejects when the repository stops answering for the item', async () => {
    await rm(itemFileOf('K-1'));

    await expect(departureFrom(root, 'K-1', 'awaiting-approval')).rejects.toThrow(
      'K-1 has no item this repository can read',
    );
  });
});
