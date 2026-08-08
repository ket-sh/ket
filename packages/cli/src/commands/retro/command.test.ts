import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

let where = '';
let lines: string[] = [];

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function turnedAway(at: string, reason: string): string {
  return `${JSON.stringify({
    gate: 'write',
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason,
  })}\n`;
}

async function governed(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-retro-'));

  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n',
  );
  await writeFile(
    join(root, '.ket', 'events.jsonl'),
    moved('K-1', 'triaged', '2026-08-04T09:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-04T10:00:00.000Z') +
      turnedAway('2026-08-04T11:00:00.000Z', 'the test comes first') +
      turnedAway('2026-08-04T12:00:00.000Z', 'the test comes first'),
  );

  return root;
}

async function reportWritten(): Promise<string> {
  const path = lines.join('').trim();

  return readFile(join(where, path), 'utf8');
}

beforeEach(async () => {
  where = await governed();
  lines = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('writing a retro into the repository it reads', () => {
  it('says where it filed the report', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z']);

    expect(lines.join('')).toMatch(/^docs\/retro\/\d{4}-W\d{2}\.md\n$/);
  });

  it('writes the week it read into the file it named', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z']);

    expect(await reportWritten()).toContain('- `write` refused 2 times: the test comes first');
  });

  it('carries the one action the largest cluster asks for', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z']);

    expect(await reportWritten()).toContain('## The one action');
  });

  it('reads only what the given moment opened, leaving the rest out', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-04T11:30:00.000Z']);

    expect(await reportWritten()).toContain('over 1 event.');
  });
});

async function quietWeek(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-retro-quiet-'));

  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n',
  );
  await writeFile(join(root, '.ket', 'config.yaml'), "key: KET\ntargets:\n  '.': cli\n");
  await writeFile(
    join(root, '.ket', 'events.jsonl'),
    moved('K-1', 'triaged', '2026-08-04T09:00:00.000Z'),
  );

  return root;
}

describe('writing a retro for a week no gate refused anything in', () => {
  it('asks for a look at the gate the preset declares and the log never recorded', async () => {
    const quiet = await quietWeek();

    await runCommand('retro', ['--cwd', quiet, '--since', '2026-08-03T00:00:00.000Z']);

    expect(await readFile(join(quiet, lines.join('').trim()), 'utf8')).toContain(
      '## The one action\n\nNo gate refused anything in this window, and the log has never recorded `check-types`. It checks types at full strictness. Examine whether the rule still earns its place.\n',
    );
  });
});

describe('asking a retro for a window nothing can read', () => {
  it('refuses by naming the moment it was handed', async () => {
    await expect(runCommand('retro', ['--cwd', where, '--since', 'last tuesday'])).rejects.toThrow(
      /last tuesday is not a moment/,
    );
  });

  it('writes no report when it refuses the window', async () => {
    await expect(
      runCommand('retro', ['--cwd', where, '--since', 'last tuesday']),
    ).rejects.toThrow();
    await expect(readFile(join(where, 'docs', 'retro'), 'utf8')).rejects.toThrow();
  });
});
