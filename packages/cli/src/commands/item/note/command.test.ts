import { runCommand as runCitty, showUsage } from 'citty';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import item from '../command.ts';
import { note } from './command.ts';

async function runItem(argv: string[]): Promise<void> {
  await runCitty(item, { rawArgs: argv });
}

let root = '';

const written: string[] = [];

beforeEach(async () => {
  written.length = 0;
  root = await mkdtemp(join(tmpdir(), 'ket-note-'));
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

async function recorded(): Promise<unknown[]> {
  const log = await readFile(join(root, '.ket', 'events.jsonl'), 'utf8').catch(() => '');

  return log
    .split('\n')
    .filter((line) => line !== '')
    .map((line): unknown => JSON.parse(line));
}

describe('the breadcrumb a working step leaves', () => {
  it('appends one note event with the words, the author and the item', async () => {
    await runItem(['note', 'K-1', 'researching the breakdown', '--actor', 'decomposer']);

    const trail = await recorded();

    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      note: 'researching the breakdown',
      actor: 'decomposer',
      item: 'K-1',
    });
  });

  it('stamps the note with the moment it landed', async () => {
    await runItem(['note', 'K-1', 'reading the prior art', '--actor', 'decomposer']);

    const trail = await recorded();
    const at: unknown =
      trail[0] !== null && typeof trail[0] === 'object' ? Reflect.get(trail[0], 'at') : undefined;

    expect(Number.isNaN(Date.parse(String(at)))).toBe(false);
  });

  it('signs an unsigned note as the harness', async () => {
    await runItem(['note', 'K-1', 'running the suite']);

    expect((await recorded())[0]).toMatchObject({ actor: 'harness' });
  });

  it('says what it noted, so a script can read the answer', async () => {
    await runItem(['note', 'K-1', 'running the suite']);

    expect(written).toContain('K-1 noted\n');
  });

  it('refuses a note that says nothing', async () => {
    await expect(runItem(['note', 'K-1', '   '])).rejects.toThrow(
      'a note says what is happening, and this one is empty',
    );

    expect(await recorded()).toHaveLength(0);
  });

  it('refuses a key no item answers to', async () => {
    await expect(runItem(['note', 'GONE-9', 'working hard'])).rejects.toThrow(
      'GONE-9 has no item this repository can read',
    );

    expect(await recorded()).toHaveLength(0);
  });
});

describe('the usage the note command prints', () => {
  function captureUsage(): () => string {
    const logged: string[] = [];

    vi.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
      logged.push(parts.join(' '));
    });

    return () => logged.join('\n');
  }

  it('describes the item, the words and the author it takes', async () => {
    const usage = captureUsage();

    await showUsage(note);

    expect(usage()).toContain('The item the note is about');
    expect(usage()).toContain('One line saying what is happening');
    expect(usage()).toContain('Who is doing the work');
  });

  it('speaks under its own name', async () => {
    const usage = captureUsage();

    await showUsage(note);

    expect(usage()).toContain('(note)');
  });

  it('stands in the item command table under its own name', async () => {
    const usage = captureUsage();

    await showUsage(item);

    expect(usage()).toMatch(/note\s+.*Say what is happening on an item right now/);
  });
});
