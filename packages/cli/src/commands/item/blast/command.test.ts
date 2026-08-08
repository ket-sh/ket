import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { blast } from './command.ts';

const CRUISE = JSON.stringify({
  modules: [
    { source: 'packages/cli/src/run.ts', dependencies: [{ resolved: 'packages/cli/src/main.ts' }] },
    { source: 'packages/cli/src/main.ts', dependencies: [] },
    { source: 'packages/preset/src/item.ts', dependencies: [] },
  ],
});

const DRAWN = 'direction: right\n"packages" -> "presets"\n';

let sandbox = '';
let launcher = '';
let root = '';
let itemDir = '';
let lines: string[] = [];

function binaryAt(name: string): string {
  return join(root, 'node_modules', '.bin', name);
}

// macOS assesses a freshly written executable on its first exec, machine-wide
// and serialized, so every stub is one launcher wearing a per-spec body.
async function stubBinary(name: string, body: string): Promise<void> {
  await writeFile(`${binaryAt(name)}-body.sh`, `${body}\n`);
  await symlink(launcher, binaryAt(name));
}

async function argvGiven(name: string): Promise<string[]> {
  const written = await readFile(`${binaryAt(name)}-args.txt`, 'utf8');

  return written
    .split('\n')
    .filter((line) => line.startsWith('[') && line.endsWith(']'))
    .map((line) => line.slice(1, -1));
}

async function ranIn(name: string): Promise<string> {
  return (await readFile(`${binaryAt(name)}-cwd.txt`, 'utf8')).trim();
}

async function scratchesLeft(): Promise<string[]> {
  return (await readdir(tmpdir()))
    .filter((entry) => entry !== 'launcher' && !entry.startsWith('ket-blast-home-'))
    .sort();
}

async function scratchAsked(): Promise<string> {
  const argv = await argvGiven('depcruise-fmt');

  return dirname(argv[argv.length - 1] ?? '');
}

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'ket-suite-blast-'));
  launcher = join(sandbox, 'launcher');
  await writeFile(
    launcher,
    '#!/bin/sh\npwd > "$0-cwd.txt"\nprintf \'[%s]\\n\' "$@" > "$0-args.txt"\nexec /bin/sh "$0-body.sh" "$@"\n',
  );
  await chmod(launcher, 0o755);
  vi.stubEnv('TMPDIR', sandbox);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(sandbox, { recursive: true, force: true });
});

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-blast-home-'));
  itemDir = join(root, '.ket', 'items', 'K-1');
  await mkdir(itemDir, { recursive: true });
  await mkdir(join(root, 'node_modules', '.bin'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets: {}\n');
  await writeFile(join(itemDir, 'item.yaml'), 'title: The blast item\nstatus: verifying\n');
  lines = [];
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function runBlast(overrides: Record<string, string> = {}): Promise<void> {
  await blast.run?.({
    args: { key: 'K-1', base: 'main', budget: '30', paths: 'src', _: [], ...overrides },
    cmd: blast,
    rawArgs: [],
  });
}

async function stubCapture(): Promise<void> {
  await stubBinary('depcruise', `cat <<'GRAPH'\n${CRUISE}\nGRAPH`);
  await stubBinary('depcruise-fmt', `cat <<'DRAWN'\n${DRAWN}DRAWN`);
}

describe('the blast command', () => {
  it('describes itself and takes the item key with a base, a budget and paths', () => {
    expect(blast.meta).toMatchObject({
      name: 'blast',
      description: 'Capture the modules a change reaches, as a diagram with its measure',
    });
    expect(blast.args).toMatchObject({
      key: { type: 'positional', required: true, description: 'The item the capture sits beside' },
      base: { default: 'main', description: 'The git revision to measure against' },
      budget: { default: '30', description: 'The node budget the diagram must fit' },
      paths: { default: 'src', description: 'Comma-separated roots to cruise' },
    });
  });

  it('writes the diagram and the measure beside the item', async () => {
    await stubCapture();

    await runBlast({ budget: '2' });

    expect(await readFile(join(itemDir, 'blast.d2'), 'utf8')).toBe(DRAWN);

    const measure: unknown = JSON.parse(await readFile(join(itemDir, 'blast.json'), 'utf8'));

    expect(measure).toMatchObject({
      base: 'main',
      collapse: 3,
      budget: 2,
      uncollapsedNodes: 3,
      uncollapsedEdges: 1,
    });
    expect(lines).toEqual(['K-1 blast captured: 3 modules, 1 edges against main\n']);
  });

  it('records when it measured, so the page can say how stale the capture is', async () => {
    await stubCapture();

    await runBlast();

    const measure: unknown = JSON.parse(await readFile(join(itemDir, 'blast.json'), 'utf8'));
    const measuredAt: unknown =
      measure !== null && typeof measure === 'object' ? Reflect.get(measure, 'measuredAt') : '';

    expect(typeof measuredAt).toBe('string');
    expect(Number.isNaN(Date.parse(String(measuredAt)))).toBe(false);
  });
});

describe('what the capture asks the cruiser', () => {
  it('cruises the declared paths against the declared base, in the project root', async () => {
    await stubCapture();

    await runBlast({ paths: ' src ,, packages ', base: 'origin/main' });

    expect(await argvGiven('depcruise')).toEqual([
      'src',
      'packages',
      '--affected',
      'origin/main',
      '--output-type',
      'json',
    ]);
    expect(await ranIn('depcruise')).toBe(await realpath(root));
  });

  it('collapses the diagram exactly when the budget demands it', async () => {
    await stubCapture();

    await runBlast({ budget: '2' });

    const collapsed = await argvGiven('depcruise-fmt');

    expect(collapsed.slice(0, 4)).toEqual(['--output-type', 'd2', '--collapse', '3']);
    expect(collapsed).toHaveLength(5);
    expect(collapsed[4]?.endsWith('cruise.json')).toBe(true);

    await runBlast({ budget: '30' });

    const uncollapsed = await argvGiven('depcruise-fmt');

    expect(uncollapsed.slice(0, 2)).toEqual(['--output-type', 'd2']);
    expect(uncollapsed).toHaveLength(3);
    expect(uncollapsed[2]?.endsWith('cruise.json')).toBe(true);
  });

  it('sweeps its scratch out of the temp directory after the capture', async () => {
    await stubCapture();

    const before = await scratchesLeft();

    await runBlast();

    expect(await scratchesLeft()).toEqual(before);
  });

  it('holds its scratch inside the temp directory, named for ket', async () => {
    await stubCapture();

    await runBlast();

    const held = await scratchAsked();

    expect(dirname(held)).toBe(tmpdir());
    expect(basename(held)).toMatch(/^ket-blast-/);
  });

  it('accepts the tightest budget there is', async () => {
    await stubCapture();

    await runBlast({ budget: '1' });

    const measure: unknown = JSON.parse(await readFile(join(itemDir, 'blast.json'), 'utf8'));

    expect(measure).toMatchObject({ collapse: 1, budget: 1 });
  });
});

describe('the refusals a capture makes', () => {
  it('refuses a budget that is not a whole positive number', async () => {
    await expect(runBlast({ budget: 'plenty' })).rejects.toThrow(/--budget/);
  });

  it('refuses a budget of zero, since a diagram of nothing measures nothing', async () => {
    await expect(runBlast({ budget: '0' })).rejects.toThrow(/--budget/);
  });

  it('names the missing cruiser and how to get it', async () => {
    await expect(runBlast()).rejects.toThrow(/install dependency-cruiser/);
  });

  it('says the cruiser answered nothing when it answers nothing', async () => {
    await stubBinary('depcruise', 'true');

    await expect(runBlast()).rejects.toThrow(/empty output/);
  });

  it('reads a grumble of bare whitespace as no answer at all', async () => {
    await stubBinary('depcruise', `printf '\\n\\n' >&2\nexit 2`);

    await expect(runBlast()).rejects.toThrow(/empty output/);
  });

  it('names the paths, the base and the grumble when the cruiser answers no readable graph', async () => {
    await stubBinary('depcruise', `echo 'boom' >&2\nexit 2`);

    await expect(runBlast({ paths: 'src,packages' })).rejects.toThrow(
      /no readable graph for src, packages against main: boom$/,
    );
  });
});
