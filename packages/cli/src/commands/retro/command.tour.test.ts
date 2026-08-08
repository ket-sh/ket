import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

interface AskedPrompt {
  message: string;
  initialValue: boolean | undefined;
}

const CANCELLED = Symbol('cancelled');

const asked: AskedPrompt[] = [];
const answers: (boolean | symbol)[] = [];
const farewells: string[] = [];

vi.mock('@clack/prompts', () => ({
  confirm: async (options: { message: string; initialValue?: boolean }) => {
    asked.push({ message: options.message, initialValue: options.initialValue });

    return Promise.resolve(answers.shift() ?? false);
  },
  isCancel: (value: unknown): boolean => typeof value === 'symbol',
  cancel: (message: string) => {
    farewells.push(message);
  },
}));

const SINCE = ['--since', '2026-08-03T00:00:00.000Z'];

const TEST_FIRST = 'the test comes first';

let where = '';
let lines: string[] = [];

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({
    gate,
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason,
  })}\n`;
}

const SEEDED =
  turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
  turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST) +
  turnedAway('review', '2026-08-04T11:00:00.000Z', 'the design names no spec');

async function governed(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-retro-tour-'));

  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), "key: KET\ntargets:\n  '.': cli\n");
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n',
  );
  await writeFile(join(root, '.ket', 'events.jsonl'), SEEDED);

  return root;
}

let stdoutWasTerminal = false;
let stdinWasTerminal = false;

function terminalOf(stdout: boolean, stdin: boolean): void {
  process.stdout.isTTY = stdout;
  process.stdin.isTTY = stdin;
}

beforeEach(async () => {
  where = await governed();
  lines = [];
  asked.length = 0;
  answers.length = 0;
  farewells.length = 0;
  stdoutWasTerminal = process.stdout.isTTY;
  stdinWasTerminal = process.stdin.isTTY;
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(() => {
  process.stdout.isTTY = stdoutWasTerminal;
  process.stdin.isTTY = stdinWasTerminal;
  vi.restoreAllMocks();
});

async function retro(...extra: string[]): Promise<unknown> {
  return runCommand('retro', ['--cwd', where, ...SINCE, ...extra]);
}

async function filedItem(key: string): Promise<string> {
  return readFile(join(where, '.ket', 'items', key, 'item.yaml'), 'utf8');
}

async function nothingFiled(): Promise<void> {
  await expect(readFile(join(where, '.ket', 'items', 'KET-1', 'item.yaml'))).rejects.toThrow();
}

describe('the tour a terminal retro ends with', () => {
  it('asks adopt or skip for each draft in order, defaulting to skip', async () => {
    terminalOf(true, true);
    answers.push(true, false);

    await retro();

    expect(asked.map((prompt) => prompt.message.split(':')[0])).toStrictEqual([
      'Draft 1',
      'Draft 2',
    ]);
    expect(asked.at(0)?.message).toContain(`\`write\` refused 2 times: ${TEST_FIRST}`);
    expect(asked.at(0)?.initialValue).toBe(false);
  });

  it('files an adopted draft and says what it filed, leaving a skipped one behind', async () => {
    terminalOf(true, true);
    answers.push(true, false);

    await retro();

    expect(await filedItem('KET-1')).toContain('status: idea');
    expect(lines.join('')).toContain('KET-1 filed from draft 1');
    await expect(readFile(join(where, '.ket', 'items', 'KET-2', 'item.yaml'))).rejects.toThrow();
  });

  it('stops the tour on a cancel, filing nothing more', async () => {
    terminalOf(true, true);
    answers.push(CANCELLED, true);

    await retro();

    expect(farewells).toStrictEqual(['The remaining drafts stay behind.']);
    await nothingFiled();
  });

  it('walks the same filing path as the command, refusing a draft already adopted', async () => {
    await runCommand('retro', ['adopt', '1', '--cwd', where, ...SINCE]);
    terminalOf(true, true);
    answers.push(true, true);
    lines = [];

    await retro();

    expect(lines.join('')).toContain('draft 1 already became KET-1');
    expect(await filedItem('KET-2')).toContain('title: `review` refused once');
  });
});

describe('a retro that is not talking to a person', () => {
  it('never prompts when neither stream is a terminal', async () => {
    terminalOf(false, false);

    await retro();

    expect(asked).toStrictEqual([]);
    await nothingFiled();
  });

  it('never prompts when only stdout is a terminal, since nobody can answer', async () => {
    terminalOf(true, false);

    await retro();

    expect(asked).toStrictEqual([]);
    await nothingFiled();
  });

  it('never prompts when only stdin is a terminal, since nobody can read', async () => {
    terminalOf(false, true);

    await retro();

    expect(asked).toStrictEqual([]);
    await nothingFiled();
  });

  it('never prompts on a JSON run, terminal or not', async () => {
    terminalOf(true, true);

    await retro('--json');

    expect(asked).toStrictEqual([]);
    await nothingFiled();
  });
});
