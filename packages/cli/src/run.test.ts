import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCommand } from './run.ts';

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed\\n' > ".claude/skills/$5/SKILL.md"
exit 0
`;

const REFUSING = `#!/bin/sh
echo "could not reach github"
exit 1
`;

let restored = '';

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-'));
}

// Every create reaches for the skills the preset locks, and a suite that let it
// reach the network would measure github rather than ket.
async function installerThat(behaves: string): Promise<void> {
  const where = await scratch();

  await writeFile(join(where, 'bunx'), behaves, 'utf8');
  await chmod(join(where, 'bunx'), 0o755);

  process.env['PATH'] = `${where}:${restored}`;
}

beforeEach(async () => {
  restored = process.env['PATH'] ?? '';

  await installerThat(OBLIGING);
});

afterEach(() => {
  process.env['PATH'] = restored;
});

describe('the ket command line', () => {
  it('creates a project where it was told to', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/config.ts'), 'utf8')).resolves.toContain("key: 'OS'");
  });

  it('makes the project a repository, since .ket lives at a git root', async () => {
    const where = join(await scratch(), 'billing-gateway');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.git', 'HEAD'), 'utf8')).resolves.toContain('ref:');
  });

  it('refuses a directory that already holds something', async () => {
    const where = join(await scratch(), 'taken');

    await mkdir(where);
    await writeFile(join(where, 'README.md'), 'mine\n');

    await expect(runCommand('create', [where])).rejects.toThrow(/not empty/);
  });

  it('writes nothing when it cannot settle a configuration without asking', async () => {
    const where = join(await scratch(), '2026');

    await expect(runCommand('create', [where])).rejects.toThrow(/nothing was configured/);
  });

  it('names the command it was asked for when that command does not exist', async () => {
    await expect(runCommand('deploy', [])).rejects.toThrow(/deploy/);
  });
});

describe('creating a project that takes the gates without the pipeline', () => {
  it('records the refusal in the config, so every later gate reads the choice', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where, '--no-workflow']);

    await expect(readFile(join(where, '.ket/config.ts'), 'utf8')).resolves.toContain(
      'workflow: false,',
    );
  });

  it('opens no board, since nothing will ever file an item onto it', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where, '--no-workflow']);

    await expect(readFile(join(where, '.ket/BOARD.md'), 'utf8')).rejects.toThrow();
  });

  it('enables the gates plugin alone, leaving the pipeline bundle out', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where, '--no-workflow']);

    const settings = await readFile(join(where, '.claude/settings.json'), 'utf8');

    expect(settings).toContain('ket@ket');
    expect(settings).not.toContain('ket-workflow@ket');
  });

  it('takes the refusal beside a preset, so a headless run needs no wizard', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web', '--no-workflow']);

    await expect(readFile(join(where, '.ket/config.ts'), 'utf8')).resolves.toContain("'.': 'web'");
  });

  it('leaves no hint token unresolved in anything it installs', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web', '--no-workflow']);

    const hero = await readFile(join(where, 'src/app/routes/index.tsx'), 'utf8');

    expect(hero).not.toContain('__HERO_HINT_TEXT__');
    expect(hero).not.toContain('__HERO_HINT_CODE__');
  });
});

describe('creating a project that drives the pipeline, the default', () => {
  it('records the choice in the config', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/config.ts'), 'utf8')).resolves.toContain(
      'workflow: true,',
    );
  });

  it('opens the board and a home for items', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/BOARD.md'), 'utf8')).resolves.toContain('board');
    await expect(readFile(join(where, '.ket/items/.gitkeep'), 'utf8')).resolves.toBe('');
  });

  it('enables the pipeline bundle beside the gates', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.claude/settings.json'), 'utf8')).resolves.toContain(
      'ket-workflow@ket',
    );
  });
});

describe('the skills a created project starts with', () => {
  it('installs what the preset locked, where the agent looks for it', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(
      readFile(join(where, '.claude', 'skills', 'vitest', 'SKILL.md'), 'utf8'),
    ).resolves.toContain('installed');
  });

  it('hands over a project that is still committed when no skill could install', async () => {
    const where = join(await scratch(), 'billing-gateway');

    await installerThat(REFUSING);
    await runCommand('create', [where]);

    await expect(readFile(join(where, 'skills-lock.json'), 'utf8')).resolves.toContain('vitest');
  });
});
