import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { teach } from '../../../vitest.toolbox-setup.ts';
import { runCommand } from '../../run.ts';
import { hashOf, parseScaffoldRecord } from '../../shared/scaffold-manifest.ts';

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

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed\\n' > ".claude/skills/$5/SKILL.md"
exit 0
`;

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

async function recordOn(root: string): Promise<Record<string, string>> {
  const record = parseScaffoldRecord(await readFile(join(root, '.ket/scaffold.yaml'), 'utf8'));

  if (record === undefined) {
    throw new Error(`${root} carries no readable scaffold record`);
  }

  return record.files;
}

async function rewriteRecord(root: string, files: Record<string, string>): Promise<void> {
  await writeFile(
    join(root, '.ket/scaffold.yaml'),
    `${JSON.stringify({ version: 1, ket: '0.0.0', files }, null, 2)}\n`,
  );
}

beforeEach(async () => {
  await teach('bunx', OBLIGING);

  where = join(await mkdtemp(join(tmpdir(), 'ket-update-')), 'order-service');
  await runCommand('create', [where]);
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
  process.exitCode = undefined;
});

describe('planning an update', () => {
  it('says each fate and writes nothing', async () => {
    await rm(join(where, 'mise.toml'));
    await committed(where);

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('restored mise.toml');
    await expect(readFile(join(where, 'mise.toml'), 'utf8')).rejects.toThrow();
  });

  it('plans over a dirty tree, since it writes nothing', async () => {
    await rm(join(where, 'mise.toml'));

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('restored mise.toml');
  });
});

describe('applying an update to a configuration that names two tools for one slot', () => {
  it('refuses rather than writing one tool over the other, since whichever ran last would win', async () => {
    await writeFile(
      join(where, '.ket/config.yaml'),
      [
        'key: ORD',
        'targets:',
        '  .: cli',
        'integrations:',
        '  - codecov',
        '  - qlty',
        'language: en',
        'workflow: true',
        '',
      ].join('\n'),
    );
    await committed(where);

    await expect(runCommand('update', [])).rejects.toThrow(/each answer for coverage/);
  });
});

describe('applying an update', () => {
  it('refuses a tree with uncommitted changes', async () => {
    await writeFile(join(where, 'stray.txt'), 'work in progress\n');

    await expect(runCommand('update', [])).rejects.toThrow(/uncommitted/);
  });

  it('restores what is missing and records every hash it now answers for', async () => {
    const recorded = await recordOn(where);
    const freshMise = await readFile(join(where, 'mise.toml'), 'utf8');

    await rm(join(where, 'mise.toml'));
    await rewriteRecord(where, { ...recorded, 'phantom.txt': hashOf('gone') });
    await committed(where);

    await runCommand('update', []);

    await expect(readFile(join(where, 'mise.toml'), 'utf8')).resolves.toBe(freshMise);

    const rewritten = await recordOn(where);

    expect(rewritten['phantom.txt']).toBeUndefined();
    expect(rewritten['mise.toml']).toBe(hashOf(freshMise));
    expect(process.exitCode).toBeUndefined();
  });

  it('holds an edited file, keeps its bytes, and exits nonzero', async () => {
    await writeFile(join(where, 'mise.toml'), '[tools]\nmine = "1"\n');
    await committed(where);

    await runCommand('update', []);

    await expect(readFile(join(where, 'mise.toml'), 'utf8')).resolves.toBe('[tools]\nmine = "1"\n');
    expect(lines.join('')).toContain('held mise.toml');
    expect(process.exitCode).toBe(1);
  });

  it('overwrites a held file when forced', async () => {
    await writeFile(join(where, 'mise.toml'), '[tools]\nmine = "1"\n');
    await committed(where);

    await runCommand('update', ['--force']);

    await expect(readFile(join(where, 'mise.toml'), 'utf8')).resolves.not.toContain('mine');
    expect(process.exitCode).toBeUndefined();
  });

  it('names the missing record when a scaffold predates it', async () => {
    await rm(join(where, '.ket/scaffold.yaml'));
    await committed(where);

    await expect(runCommand('update', [])).rejects.toThrow(/scaffold\.yaml/);
  });
});

describe('applying an update to a project an older ket scaffolded', () => {
  it('refuses every old name in one breath rather than migrating what it would have to run', async () => {
    await rm(join(where, '.ket/scaffold.yaml'));
    await writeFile(join(where, '.ket/scaffold.json'), '{}\n');
    await writeFile(join(where, '.ket/config.ts'), 'export default {};\n');
    await committed(where);

    await expect(runCommand('update', [])).rejects.toThrow(
      /update cannot rewrite it for you.*rewrite \.ket\/config\.ts.*rename \.ket\/scaffold\.json/su,
    );
  });

  it('says nothing about an old name the project never carried', async () => {
    await writeFile(join(where, '.ket/config.ts'), 'export default {};\n');
    await committed(where);

    await expect(runCommand('update', [])).rejects.toThrow(/^(?:(?!toolchain).)*$/su);
  });
});

describe('applying an update to a project whose plugins an older ket enabled', () => {
  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  async function settingsOn(root: string): Promise<Record<string, unknown>> {
    const held: unknown = JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8'));

    return isRecord(held) ? held : {};
  }

  async function enabledPluginsRewrittenTo(enabled: Record<string, boolean>): Promise<void> {
    const held = await settingsOn(where);

    await writeFile(
      join(where, '.claude/settings.json'),
      `${JSON.stringify({ ...held, enabledPlugins: enabled }, undefined, 2)}\n`,
    );
    await committed(where);
  }

  async function enabledAfterUpdate(): Promise<unknown> {
    return (await settingsOn(where))['enabledPlugins'];
  }

  it('rewrites both keys, keeping the workflow the project took', async () => {
    await enabledPluginsRewrittenTo({ 'ket@ket': true, 'ket-workflow@ket': true });

    await runCommand('update', []);

    expect(await enabledAfterUpdate()).toStrictEqual({ 'ket-gates@ket': true, 'ket@ket': true });
    expect(lines.join('')).toContain('migrated .claude/settings.json');
  });

  it('rewrites the gates key alone for a project that declined the pipeline', async () => {
    await enabledPluginsRewrittenTo({ 'ket@ket': true });

    await runCommand('update', []);

    expect(await enabledAfterUpdate()).toStrictEqual({ 'ket-gates@ket': true });
  });

  it('says the migration in the plan and writes nothing', async () => {
    await enabledPluginsRewrittenTo({ 'ket@ket': true, 'ket-workflow@ket': true });

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('migrated .claude/settings.json');
    expect(await enabledAfterUpdate()).toStrictEqual({ 'ket@ket': true, 'ket-workflow@ket': true });
  });

  it('leaves settings already under the current names byte for byte', async () => {
    const before = await readFile(join(where, '.claude/settings.json'), 'utf8');

    await runCommand('update', []);

    await expect(readFile(join(where, '.claude/settings.json'), 'utf8')).resolves.toBe(before);
    expect(lines.join('')).not.toContain('migrated');
  });
});
