import { runCommand as runCitty, showUsage } from 'citty';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as settling } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import item from '../command.ts';
import { awaitItem } from './command.ts';

async function runItem(argv: string[]): Promise<void> {
  await runCitty(item, { rawArgs: argv });
}

let root = '';

const written: string[] = [];

beforeEach(async () => {
  written.length = 0;
  root = await mkdtemp(join(tmpdir(), 'ket-await-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'config.yaml'),
    'key: K\ntargets:\n  .: cli\nintegrations: []\nlanguage: en\nworkflow: true\n',
  );
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  );
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    written.push(String(chunk));

    return true;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function untilTheWatchArms(): Promise<void> {
  const log = join(root, '.ket', 'events.jsonl');

  while ((await stat(log).catch(() => undefined)) === undefined) {
    await settling(5);
  }
}

describe('the shape of the await command', () => {
  it('names itself and its arguments for the cli', () => {
    expect(awaitItem.meta).toMatchObject({
      name: 'await',
      description: 'Block until an item leaves the status it holds',
    });
    expect(awaitItem.args).toMatchObject({
      key: { type: 'positional', required: true, description: 'The item to wait on' },
      past: { type: 'string', description: 'The status the item must move past' },
    });
  });
});

describe('waiting on an item until it moves', () => {
  it('refuses a key no item answers to', async () => {
    await expect(runItem(['await', 'GONE-9'])).rejects.toThrow(
      'GONE-9 has no item this repository can read',
    );
  });

  it('refuses a status nothing in the lifecycle names', async () => {
    await expect(runItem(['await', 'K-1', '--past', 'halfway'])).rejects.toThrow(
      'halfway is not one of idea, triaged, designing, awaiting-approval, implementing, ' +
        'verifying, awaiting-merge, shipped',
    );
  });

  it('answers at once with what happened when the item already left the named status', async () => {
    await runItem(['await', 'K-1', '--past', 'triaged']);

    expect(written).toContain('{"key":"K-1","from":"triaged","to":"designing"}\n');
  });

  it('answers from the item alone, leaving no log behind', async () => {
    await runItem(['await', 'K-1', '--past', 'triaged']);

    await expect(stat(join(root, '.ket', 'events.jsonl'))).rejects.toThrow();
  });

  it('blocks until the named status is left, then says the move as one json line', async () => {
    const waited = runItem(['await', 'K-1', '--past', 'designing']);

    await runItem(['submit', 'K-1']);

    await waited;

    expect(written).toContain('{"key":"K-1","from":"designing","to":"awaiting-approval"}\n');
  });

  it('takes the status it finds as the departure point', async () => {
    const waited = runItem(['await', 'K-1']);

    await untilTheWatchArms();
    await runItem(['submit', 'K-1']);

    await waited;

    expect(written).toContain('{"key":"K-1","from":"designing","to":"awaiting-approval"}\n');
  });
});

describe('the usage the await command prints', () => {
  function captureUsage(): () => string {
    const logged: string[] = [];

    vi.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
      logged.push(parts.join(' '));
    });

    return () => logged.join('\n');
  }

  it('speaks under its own name', async () => {
    const usage = captureUsage();

    await showUsage(awaitItem);

    expect(usage()).toContain('(await)');
  });

  it('stands in the item command table under its own name', async () => {
    const usage = captureUsage();

    await showUsage(item);

    expect(usage()).toMatch(/await\s+.*Block until an item leaves the status it holds/);
  });
});
