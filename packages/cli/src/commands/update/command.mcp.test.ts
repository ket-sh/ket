import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed\\n' > ".claude/skills/$5/SKILL.md"
exit 0
`;

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

let restored = '';
let where = '';
let lines: string[] = [];

async function registrationOn(root: string): Promise<unknown> {
  const written = await readFile(join(root, '.mcp.json'), 'utf8').catch(() => undefined);

  return JSON.parse(written ?? '{}');
}

beforeEach(async () => {
  restored = process.env['PATH'] ?? '';

  const stubs = await mkdtemp(join(tmpdir(), 'ket-update-mcp-stub-'));

  await writeFile(join(stubs, 'bunx'), OBLIGING, 'utf8');
  await chmod(join(stubs, 'bunx'), 0o755);
  process.env['PATH'] = `${stubs}:${restored}`;

  where = join(await mkdtemp(join(tmpdir(), 'ket-update-mcp-')), 'storefront');
  await runCommand('create', [where, '--preset', 'web', '--with', 'mobbin']);
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

describe('updating a project whose scaffold never registered the chosen server', () => {
  it('merges the registration the recorded choice always promised', async () => {
    await rm(join(where, '.mcp.json'));
    await committed(where);

    await runCommand('update', []);

    expect(await registrationOn(where)).toStrictEqual({
      mcpServers: { mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' } },
    });
    expect(lines.join('')).toContain('merged .mcp.json');
  });

  it('says the merge in the plan and writes nothing', async () => {
    await rm(join(where, '.mcp.json'));
    await committed(where);

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('merged .mcp.json');
    expect(await registrationOn(where)).toStrictEqual({});
  });
});

describe('updating a project that added servers of its own', () => {
  it('adds the chosen server beside them and keeps every one', async () => {
    const own = { mcpServers: { figma: { type: 'http', url: 'https://figma.example/mcp' } } };

    await writeFile(join(where, '.mcp.json'), `${JSON.stringify(own, undefined, 2)}\n`);
    await committed(where);

    await runCommand('update', []);

    expect(await registrationOn(where)).toStrictEqual({
      mcpServers: {
        figma: { type: 'http', url: 'https://figma.example/mcp' },
        mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' },
      },
    });
  });
});

describe('updating a project whose registration already stands', () => {
  it('leaves the file byte for byte and says nothing about it', async () => {
    const before = await readFile(join(where, '.mcp.json'), 'utf8');

    await runCommand('update', []);

    await expect(readFile(join(where, '.mcp.json'), 'utf8')).resolves.toBe(before);
    expect(lines.join('')).not.toContain('merged');
  });
});
