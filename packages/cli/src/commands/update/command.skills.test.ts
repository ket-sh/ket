import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed from %s\\n' "$3" > ".claude/skills/$5/SKILL.md"
exit 0
`;

const REFUSING = `#!/bin/sh
echo "could not reach github"
exit 1
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

async function installerThat(behaves: string): Promise<void> {
  const stubs = await mkdtemp(join(tmpdir(), 'ket-update-skills-stub-'));

  await writeFile(join(stubs, 'bunx'), behaves, 'utf8');
  await chmod(join(stubs, 'bunx'), 0o755);
  process.env['PATH'] = `${stubs}:${restored}`;
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

async function skillOn(root: string, name: string): Promise<string | undefined> {
  return readFile(join(root, '.claude', 'skills', name, 'SKILL.md'), 'utf8').catch(() => undefined);
}

async function withoutTheSkill(name: string): Promise<void> {
  await rm(join(where, '.claude', 'skills', name), { recursive: true });
  await committed(where);
}

beforeEach(async () => {
  restored = process.env['PATH'] ?? '';
  await installerThat(OBLIGING);

  where = join(await mkdtemp(join(tmpdir(), 'ket-update-skills-')), 'storefront');
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

describe('updating a project missing a skill the preset locks', () => {
  it('installs it where the agent looks for it', async () => {
    await withoutTheSkill('vitest');

    await runCommand('update', []);

    await expect(skillOn(where, 'vitest')).resolves.toContain('antfu/skills');
  });

  it('says which skill arrived', async () => {
    await withoutTheSkill('vitest');

    await runCommand('update', []);

    expect(lines.join('')).toContain('installed vitest');
  });

  it('says the install in the plan and installs nothing', async () => {
    await withoutTheSkill('vitest');

    await runCommand('update', ['--plan']);

    expect(lines.join('')).toContain('installed vitest');
    await expect(skillOn(where, 'vitest')).resolves.toBeUndefined();
  });
});

describe('updating a project that already holds every locked skill', () => {
  it('leaves the bytes the project holds alone', async () => {
    await writeFile(join(where, '.claude', 'skills', 'vitest', 'SKILL.md'), 'mine\n');
    await committed(where);

    await runCommand('update', []);

    await expect(skillOn(where, 'vitest')).resolves.toBe('mine\n');
  });

  it('says nothing about a skill it did not install', async () => {
    await runCommand('update', []);

    expect(lines.join('')).not.toContain('installed vitest');
  });
});

describe('updating a project that chose an integration after it was created', () => {
  it('brings the skills the choice always promised', async () => {
    await writeFile(join(where, '.ket/config.yaml'), CHOOSING_CHROMATIC);
    await committed(where);

    await runCommand('update', []);

    await expect(skillOn(where, 'chromatic-setup-ci')).resolves.toContain(
      'chromaui/chromatic-skills',
    );
  });
});

describe('updating a project when the skills tool refuses', () => {
  it('says which skill did not arrive, in the words of the tool', async () => {
    await withoutTheSkill('vitest');
    await installerThat(REFUSING);

    await runCommand('update', []);

    expect(lines.join('')).toContain('vitest did not install from antfu/skills');
  });
});
