import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { SkillsInstalled } from './skills.ts';

import { teach } from '../../vitest.toolbox-setup.ts';
import { absentSkillsIn, installSkills } from './skills-install.ts';

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

async function installerThat(behaves: string): Promise<void> {
  await teach('bunx', behaves);
}

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-project-'));
}

function refusalIn(outcome: SkillsInstalled): string {
  return 'refused' in outcome ? outcome.refused : '';
}

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
});

describe('which locked skills a project still needs', () => {
  async function holding(names: string[]): Promise<string> {
    const root = await project();

    for (const name of names) {
      await mkdir(join(root, '.claude', 'skills', name), { recursive: true });
    }

    return root;
  }

  it('needs every locked skill when the project holds none', async () => {
    expect(await absentSkillsIn(await project(), LOCKFILE)).toStrictEqual([
      { name: 'find-skills', source: 'vercel-labs/skills' },
      { name: 'vitest', source: 'antfu/skills' },
    ]);
  });

  it('needs only what no directory under the agent already holds', async () => {
    expect(await absentSkillsIn(await holding(['find-skills']), LOCKFILE)).toStrictEqual([
      { name: 'vitest', source: 'antfu/skills' },
    ]);
  });

  it('needs nothing when the project holds every locked skill', async () => {
    expect(await absentSkillsIn(await holding(['find-skills', 'vitest']), LOCKFILE)).toStrictEqual(
      [],
    );
  });

  it('needs the skills a chosen integration brings beside the locked ones', async () => {
    const brought = { name: 'chromatic-setup-ci', source: 'chromaui/chromatic-skills' };

    expect(
      await absentSkillsIn(await holding(['find-skills', 'vitest']), LOCKFILE, [brought]),
    ).toStrictEqual([brought]);
  });

  it('needs only the brought skills when the preset ships no lockfile', async () => {
    const brought = { name: 'chromatic-setup-ci', source: 'chromaui/chromatic-skills' };

    expect(await absentSkillsIn(await project(), undefined, [brought])).toStrictEqual([brought]);
  });

  it('needs nothing when a preset that ships no lockfile brings nothing', async () => {
    expect(await absentSkillsIn(await project(), undefined)).toStrictEqual([]);
  });

  it('refuses a lockfile ket cannot read rather than deciding it needs nothing', async () => {
    await expect(absentSkillsIn(await project(), 'not a lockfile')).rejects.toThrow(
      'ket cannot read the skills lockfile its preset ships: the skills lockfile is not json anything can read',
    );
  });
});

describe('what the install report says when something refuses', () => {
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

  it('refuses a preset that shipped no lockfile, naming what is missing', async () => {
    await installerThat(OBLIGING);

    expect(await installSkills(await project(), undefined)).toStrictEqual({
      refused: 'the preset shipped no skills lockfile to install from',
    });
  });

  it('separates the refusals so each reads on its own line', async () => {
    await installerThat(REFUSING);

    const lines = refusalIn(await installSkills(await project(), LOCKFILE)).split('\n');

    expect(lines).toContain(
      'find-skills did not install from vercel-labs/skills: could not reach github',
    );
    expect(lines).toContain('vitest did not install from antfu/skills: could not reach github');
  });
});
