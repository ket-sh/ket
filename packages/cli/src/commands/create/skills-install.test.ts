import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SkillsInstalled } from './skills.ts';

import { installSkills } from './skills-install.ts';

const LOCKFILE = JSON.stringify({
  version: 1,
  skills: {
    'find-skills': { source: 'vercel-labs/skills' },
    vitest: { source: 'antfu/skills' },
  },
});

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed from %s\\n' "$3" > ".claude/skills/$5/SKILL.md"
exit 0
`;

const REFUSING = `#!/bin/sh
echo "could not reach github"
exit 1
`;

const SILENT_ON_STDERR = `#!/bin/sh
echo "clone timed out" >&1
exit 1
`;

const PATH_SEPARATOR = ':';

let restored = '';

async function installerThat(behaves: string): Promise<void> {
  const where = await mkdtemp(join(tmpdir(), 'ket-installer-'));

  await writeFile(join(where, 'bunx'), behaves, 'utf8');
  await chmod(join(where, 'bunx'), 0o755);

  process.env['PATH'] = `${where}${PATH_SEPARATOR}${restored}`;
}

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-project-'));
}

function refusalIn(outcome: SkillsInstalled): string {
  return 'refused' in outcome ? outcome.refused : '';
}

beforeEach(() => {
  restored = process.env['PATH'] ?? '';
});

afterEach(() => {
  process.env['PATH'] = restored;
});

describe('installing the skills a preset locks', () => {
  it('installs every skill the lockfile records, and says which arrived', async () => {
    await installerThat(OBLIGING);

    expect(await installSkills(await project(), LOCKFILE)).toStrictEqual({
      installed: ['find-skills', 'vitest'],
    });
  });

  it('installs the skills a chosen integration brings beside the locked ones', async () => {
    await installerThat(OBLIGING);

    const outcome = await installSkills(await project(), LOCKFILE, [
      { name: 'chromatic-setup-ci', source: 'chromaui/skills' },
    ]);

    expect(outcome).toStrictEqual({
      installed: ['find-skills', 'vitest', 'chromatic-setup-ci'],
    });
  });

  it('leaves each skill where the agent looks for it', async () => {
    await installerThat(OBLIGING);

    const root = await project();

    await installSkills(root, LOCKFILE);

    await expect(
      readFile(join(root, '.claude', 'skills', 'vitest', 'SKILL.md'), 'utf8'),
    ).resolves.toContain('antfu/skills');
  });

  it('refuses in the words of the tool, naming the skill that did not arrive', async () => {
    await installerThat(REFUSING);

    expect(refusalIn(await installSkills(await project(), LOCKFILE))).toContain(
      'find-skills did not install from vercel-labs/skills: could not reach github',
    );
  });

  it('names every skill that did not arrive, not only the first to refuse', async () => {
    await installerThat(REFUSING);

    expect(refusalIn(await installSkills(await project(), LOCKFILE))).toContain(
      'vitest did not install from antfu/skills',
    );
  });

  it('reads the exit code rather than stderr, since the tool complains on stdout', async () => {
    await installerThat(SILENT_ON_STDERR);

    expect(refusalIn(await installSkills(await project(), LOCKFILE))).toContain('clone timed out');
  });

  it('refuses a lockfile it cannot read rather than installing nothing quietly', async () => {
    await installerThat(OBLIGING);

    expect(await installSkills(await project(), 'not a lockfile')).toStrictEqual({
      refused: 'the skills lockfile is not json anything can read',
    });
  });
});
