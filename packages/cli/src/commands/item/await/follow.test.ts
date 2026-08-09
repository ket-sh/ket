import { spawn } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as settling } from 'node:timers/promises';
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

async function writtenDriver(): Promise<string> {
  const driver = join(root, 'driver.ts');
  const followed = new URL('./follow.ts', import.meta.url).href;
  const departure = JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: 'implementing',
    item: 'K-1',
    at: new Date().toISOString(),
  });

  await writeFile(
    driver,
    `import { departureFrom } from '${followed}';\n` +
      `import { appendFile } from 'node:fs/promises';\n` +
      `setTimeout(() => {\n` +
      `  void appendFile(${JSON.stringify(logFile())}, ${JSON.stringify(`${departure}\n`)}, 'utf8');\n` +
      `}, 80);\n` +
      `await departureFrom(${JSON.stringify(root)}, 'K-1', 'awaiting-approval');\n`,
  );

  return driver;
}

async function exitCodeOf(driver: string): Promise<number | null> {
  return new Promise<number | null>((settle) => {
    const child = spawn('bun', [driver], { stdio: 'ignore' });
    const giveUp = setTimeout(() => {
      child.kill();
      settle(null);
    }, 4000);

    child.on('close', (code: number | null) => {
      clearTimeout(giveUp);
      settle(code);
    });
  });
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

describe('the departures a fresh wait must tell apart', () => {
  it('passes over the departures history already recorded', async () => {
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'triaged', item: 'K-1' });
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'designing', item: 'K-1' });

    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');

    await expect(departed).resolves.toBe('implementing');
  });

  it('anchors on the last arrival of the very item, passing every lookalike', async () => {
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'designing', item: 'K-1' });
    await recorded({
      gate: 'transition',
      outcome: 'allowed',
      about: 'awaiting-approval',
      item: 'K-1',
    });
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'implementing', item: 'K-1' });
    await recorded({
      gate: 'transition',
      outcome: 'allowed',
      about: 'awaiting-approval',
      item: 'K-2',
    });
    await recorded({
      gate: 'transition',
      outcome: 'refused',
      about: 'awaiting-approval',
      item: 'K-1',
    });
    await recorded({ gate: 'write', outcome: 'allowed', about: 'awaiting-approval', item: 'K-1' });

    await expect(departureFrom(root, 'K-1', 'awaiting-approval')).resolves.toBe('implementing');
  });

  it('completes on a departure only the log records', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await recorded({ gate: 'transition', outcome: 'allowed', about: 'implementing', item: 'K-1' });

    await expect(departed).resolves.toBe('implementing');
  });

  it('completes on a departure the log records after the watch settled', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await settling(100);
    await recorded({ gate: 'transition', outcome: 'allowed', about: 'implementing', item: 'K-1' });

    await expect(departed).resolves.toBe('implementing');
  });
});

describe('the trace the wait leaves behind', () => {
  it('stops touching the log once the wait ends', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');
    await departed;

    const settled = (await stat(logFile())).mtimeMs;

    await settling(120);

    expect((await stat(logFile())).mtimeMs).toBe(settled);
  });

  it('adds no words of its own to the log', async () => {
    const departed = departureFrom(root, 'K-1', 'awaiting-approval');

    await movedTo('K-1', 'implementing');
    await departed;

    const lines = (await readFile(logFile(), 'utf8')).split('\n').filter((line) => line !== '');

    for (const line of lines) {
      expect(() => {
        JSON.parse(line);
      }).not.toThrow();
    }
  });

  it('releases the process once the wait ends', async () => {
    const driver = await writtenDriver();

    await expect(exitCodeOf(driver)).resolves.toBe(0);
  });
});
