import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

const RUNNER = join(import.meta.dirname, '..', 'files', 'mutate-changed.mts');

const HERMETIC_GIT = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_AUTHOR_NAME: 'preset spec',
  GIT_AUTHOR_EMAIL: 'spec@ket.invalid',
  GIT_COMMITTER_NAME: 'preset spec',
  GIT_COMMITTER_EMAIL: 'spec@ket.invalid',
};

const written: string[] = [];

function scaffolded(): string {
  const project = mkdtempSync(join(tmpdir(), 'mutate-changed-'));

  written.push(project);
  writeFileSync(
    join(project, 'stryker.conf.json'),
    JSON.stringify({ mutate: ['src/**/*.ts', '!src/**/*.test.ts'] }),
  );
  mkdirSync(join(project, 'scripts'));
  cpSync(RUNNER, join(project, 'scripts', 'mutate-changed.mts'));

  return project;
}

function git(project: string, args: string[]): void {
  const asked = spawnSync('git', args, { cwd: project, env: { ...process.env, ...HERMETIC_GIT } });

  expect(asked.status).toBe(0);
}

interface GateRun {
  status: number | null;
  said: string;
}

interface GateAsk {
  args?: string[];
  env?: Record<string, string>;
}

function gateRun(project: string, ask: GateAsk = {}): GateRun {
  const ambient: Record<string, string | undefined> = { ...process.env, ...HERMETIC_GIT };

  delete ambient['GITHUB_BASE_REF'];

  const ran = spawnSync(
    process.execPath,
    [join('scripts', 'mutate-changed.mts'), ...(ask.args ?? [])],
    { cwd: project, encoding: 'utf8', env: { ...ambient, ...ask.env } },
  );

  return { status: ran.status, said: `${ran.stdout}${ran.stderr}` };
}

afterEach(() => {
  for (const project of written.splice(0)) {
    rmSync(project, { recursive: true, force: true });
  }
});

describe('the stryker the scoped gate reaches', () => {
  it('runs the shim the project ships, handing it the scope', () => {
    const project = scaffolded();

    git(project, ['init', '--quiet', '-b', 'main']);
    git(project, ['add', '--all']);
    git(project, ['commit', '--quiet', '-m', 'chore: scaffold with ket']);
    mkdirSync(join(project, 'node_modules', '.bin'), { recursive: true });
    writeFileSync(
      join(project, 'node_modules', '.bin', 'stryker'),
      "#!/usr/bin/env node\nconsole.log(['stryker', ...process.argv.slice(2)].join(' '));\n",
      { mode: 0o755 },
    );
    mkdirSync(join(project, 'src'));
    writeFileSync(join(project, 'src', 'lockout.ts'), 'export const lockedOut = true;\n');

    const { status, said } = gateRun(project);

    expect(said).toContain('stryker run --mutate src/lockout.ts');
    expect(status).toBe(0);
  });
});

describe('the scoped mutation gate in a newborn project', () => {
  it('skips loudly when git tracks nothing yet, since there is no change to measure', () => {
    const { status, said } = gateRun(scaffolded());

    expect(said).toContain('skips');
    expect(said).toContain('test:mutation:full');
    expect(status).toBe(0);
  });

  it('skips loudly when the scaffold commit sits on a branch that is not main', () => {
    const project = scaffolded();

    git(project, ['init', '--quiet', '-b', 'master']);
    git(project, ['add', '--all']);
    git(project, ['commit', '--quiet', '-m', 'chore: scaffold with ket']);

    const { status, said } = gateRun(project);

    expect(said).toContain('skips');
    expect(said).toContain('test:mutation:full');
    expect(status).toBe(0);
  });

  it('ignores the base CI exported for some outer repository, since ambience is not intent', () => {
    const project = scaffolded();

    git(project, ['init', '--quiet', '-b', 'master']);
    git(project, ['add', '--all']);
    git(project, ['commit', '--quiet', '-m', 'chore: scaffold with ket']);

    const { status, said } = gateRun(project, { env: { GITHUB_BASE_REF: 'main' } });

    expect(said).toContain('skips');
    expect(status).toBe(0);
  });

  it('still refuses a base that was asked for and answers nothing, since CI must stay loud', () => {
    const project = scaffolded();

    git(project, ['init', '--quiet', '-b', 'main']);
    git(project, ['add', '--all']);
    git(project, ['commit', '--quiet', '-m', 'chore: scaffold with ket']);

    const { status, said } = gateRun(project, { args: ['--base', 'origin/nowhere'] });

    expect(said).toContain('origin/nowhere');
    expect(status).toBe(1);
  });
});
