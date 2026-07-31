import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { harnessSkillsOf } from './harness-skills.ts';

async function repositoryShipping(skills: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-harness-'));

  for (const skill of skills) {
    await mkdir(join(root, 'harness', 'skills', skill), { recursive: true });
    await writeFile(join(root, 'harness', 'skills', skill, 'SKILL.md'), '', 'utf8');
  }

  return root;
}

describe('the skills a harness ships', () => {
  it('names every skill the harness carries', async () => {
    const root = await repositoryShipping(['tdd', 'gates']);

    expect((await harnessSkillsOf(root)).toSorted()).toStrictEqual(['gates', 'tdd']);
  });

  it('names no skill for a loose file sitting beside them', async () => {
    const root = await repositoryShipping(['tdd']);

    await writeFile(join(root, 'harness', 'skills', 'README.md'), '', 'utf8');

    expect(await harnessSkillsOf(root)).toStrictEqual(['tdd']);
  });

  it('refuses a repository with no harness, naming the directory it looked in', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-harness-'));

    await expect(harnessSkillsOf(root)).rejects.toThrow(join(root, 'harness', 'skills'));
  });
});
