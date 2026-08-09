import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed\\n' > ".claude/skills/$5/SKILL.md"
exit 0
`;

const CHOOSING_CHROMATIC = [
  'key: STOR',
  'targets:',
  '  .: web',
  'integrations:',
  '  - chromatic',
  'language: en',
  'workflow: true',
  '',
].join('\n');

async function ran(argv: string[], root: string): Promise<void> {
  await new Promise<void>((settle, refuse) => {
    const [binary, ...rest] = argv;
    const child = spawn(binary ?? '', rest, { cwd: root });

    child.on('close', (code) => {
      if (code === 0) {
        settle();
      } else {
        refuse(new Error(`${argv.join(' ')} exited with ${String(code)}`));
      }
    });
  });
}

let restored = '';
let where = '';
let lines: string[] = [];

async function committed(root: string): Promise<void> {
  await ran(['git', 'add', '--all'], root);
  await ran(
    [
      'git',
      '-c',
      'user.name=ket',
      '-c',
      'user.email=ket@test',
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'base',
    ],
    root,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function manifestOn(root: string): Promise<Record<string, unknown>> {
  const held: unknown = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

  return isRecord(held) ? held : {};
}

async function developmentPinsOn(root: string): Promise<Record<string, unknown>> {
  const held = (await manifestOn(root))['devDependencies'];

  return isRecord(held) ? held : {};
}

async function chromaticChosen(): Promise<void> {
  await writeFile(join(where, '.ket/config.yaml'), CHOOSING_CHROMATIC);
  await committed(where);
}

beforeEach(async () => {
  restored = process.env['PATH'] ?? '';

  const stubs = await mkdtemp(join(tmpdir(), 'ket-update-manifest-stub-'));

  await writeFile(join(stubs, 'bunx'), OBLIGING, 'utf8');
  await chmod(join(stubs, 'bunx'), 0o755);
  process.env['PATH'] = `${stubs}:${restored}`;

  where = join(await mkdtemp(join(tmpdir(), 'ket-update-manifest-')), 'storefront');
  await runCommand('create', [where, '--preset', 'web']);
  await committed(where);

  lines = [];
  vi.spyOn(process, 'cwd').mockReturnValue(where);
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env['PATH'] = restored;
  process.exitCode = undefined;
});

describe('updating a project that chose an integration after it was created', () => {
  it('brings the pins the choice always promised', async () => {
    await chromaticChosen();

    await runCommand('update', []);

    expect(await developmentPinsOn(where)).toMatchObject({
      chromatic: '18.1.0',
      '@chromatic-com/playwright': '0.14.11',
    });
  });

  it('says the merge in its own words', async () => {
    await chromaticChosen();

    await runCommand('update', []);

    expect(lines.join('')).toContain('merged package.json');
  });

  it('says the merge in the plan and writes nothing', async () => {
    await chromaticChosen();

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('merged package.json');
    expect(await developmentPinsOn(where)).not.toHaveProperty('chromatic');
  });
});

describe('updating a project that pinned a version of its own', () => {
  it('keeps the version the project holds and adds only what is missing', async () => {
    const held = await manifestOn(where);
    const pins = await developmentPinsOn(where);

    await writeFile(
      join(where, 'package.json'),
      `${JSON.stringify({ ...held, devDependencies: { ...pins, vitest: '3.0.0' } }, undefined, 2)}\n`,
    );
    await chromaticChosen();

    await runCommand('update', []);

    expect(await developmentPinsOn(where)).toMatchObject({ vitest: '3.0.0', chromatic: '18.1.0' });
  });
});

describe('updating a project whose manifest already holds everything', () => {
  it('leaves the file byte for byte and says nothing about it', async () => {
    const before = await readFile(join(where, 'package.json'), 'utf8');

    await runCommand('update', []);

    await expect(readFile(join(where, 'package.json'), 'utf8')).resolves.toBe(before);
    expect(lines.join('')).not.toContain('merged package.json');
  });
});
