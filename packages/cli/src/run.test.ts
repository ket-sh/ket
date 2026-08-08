import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCommand } from './run.ts';
import { hashOf, parseScaffoldRecord } from './shared/scaffold-manifest.ts';
import { KET_VERSION } from './shared/version.ts';

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

const scratched: string[] = [];

async function scratch(): Promise<string> {
  const where = await mkdtemp(join(tmpdir(), 'ket-'));

  scratched.push(where);

  return where;
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

afterEach(async () => {
  process.env['PATH'] = restored;

  await Promise.all(
    scratched.splice(0).map(async (where) => rm(where, { recursive: true, force: true })),
  );
});

describe('the ket command line', () => {
  it('creates a project where it was told to', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain('key: OS');
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

  it('writes nothing for a name that could cut the code it lands in', async () => {
    const where = join(await scratch(), "shop'; break(); const z = '");

    await expect(runCommand('create', [where])).rejects.toThrow(/cannot name a project/);
  });
});

describe('creating a project that can update itself later', () => {
  it('records what it wrote in .ket/scaffold.yaml, so an update compares by hash', async () => {
    const where = join(await scratch(), 'ledger-service');

    await runCommand('create', [where]);

    const record = parseScaffoldRecord(await readFile(join(where, '.ket/scaffold.yaml'), 'utf8'));

    expect(record?.ket).toBe(KET_VERSION);
    expect(record?.files['tsconfig.json']).toBe(
      hashOf(await readFile(join(where, 'tsconfig.json'))),
    );
    expect(record?.files['.gitignore']).toBeUndefined();
  });
});

describe('creating a project that documents in another language', () => {
  it('lands the core prose gates, records the choice, and pins the dictionary', async () => {
    const where = join(await scratch(), 'sube-defteri');

    await runCommand('create', [where, '--language', 'tr']);

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain(
      'language: tr',
    );

    const vale = await readFile(join(where, '.vale.ini'), 'utf8');

    expect(vale).toContain('BasedOnStyles = Vale, ket');
    expect(vale).toContain('[CLAUDE.md]');
    await expect(readFile(join(where, '.vale.core.ini'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(where, 'package.json'), 'utf8')).resolves.toContain(
      '@cspell/dict-tr-tr',
    );
    await expect(readFile(join(where, 'cspell.json'), 'utf8')).resolves.toContain(
      'cspell-ext.json',
    );
  });

  it('keeps English as today, byte for byte, and never lands the core carrier', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain(
      'language: en',
    );
    await expect(readFile(join(where, '.vale.core.ini'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(where, '.vale.ini'), 'utf8')).resolves.toContain(
      'Microsoft.Passive = error',
    );
    await expect(readFile(join(where, 'cspell.json'), 'utf8')).resolves.not.toContain(
      'cspell-ext.json',
    );
  });
});

describe('creating a project that takes the gates without the pipeline', () => {
  it('records the refusal in the config, so every later gate reads the choice', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where, '--no-workflow']);

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain(
      'workflow: false',
    );
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

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain('.: web');
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

    await expect(readFile(join(where, '.ket/config.yaml'), 'utf8')).resolves.toContain(
      'workflow: true',
    );
  });

  it('opens a home for items and renders no board beside it', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/items/.gitkeep'), 'utf8')).resolves.toBe('');
    await expect(readFile(join(where, '.ket/BOARD.md'), 'utf8')).rejects.toThrow();
  });

  it('enables the pipeline bundle beside the gates', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.claude/settings.json'), 'utf8')).resolves.toContain(
      'ket-workflow@ket',
    );
  });
});

describe('the law a created project reads from CLAUDE.md', () => {
  it('teaches the pipeline when the project takes the workflow', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web']);

    await expect(readFile(join(where, 'CLAUDE.md'), 'utf8')).resolves.toContain('/ket:feature');
    expect(await readdir(where)).not.toContain('CLAUDE.plain.md');
  });

  it('teaches no pipeline when the project declines it', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web', '--no-workflow']);

    const law = await readFile(join(where, 'CLAUDE.md'), 'utf8');

    expect(law).not.toContain('/ket:');
    expect(await readdir(where)).not.toContain('CLAUDE.plain.md');
  });
});

describe('the hero hint a created page shows', () => {
  it('points at the first feature when the project takes the workflow', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web']);

    const hero = await readFile(join(where, 'src/app/routes/index.tsx'), 'utf8');

    expect(hero).toContain('Start your first feature in Claude Code with');
    expect(hero).toContain('/ket:feature "your prompt"');
  });

  it('points at the code when the project declines the workflow', async () => {
    const where = join(await scratch(), 'shop-front');

    await runCommand('create', [where, '--preset', 'web', '--no-workflow']);

    const hero = await readFile(join(where, 'src/app/routes/index.tsx'), 'utf8');

    expect(hero).toContain('Make it yours: edit');
    expect(hero).toContain('src/entities/welcome');
    expect(hero).not.toContain('/ket:feature');
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
