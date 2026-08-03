import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { harnessSkillsOf } from './harness-skills.ts';

async function repositoryShipping(
  gatesSkills: string[],
  workflowSkills: string[],
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-harness-'));

  await mkdir(join(root, 'harness', 'gates', 'skills'), { recursive: true });
  await mkdir(join(root, 'harness', 'workflow', 'skills'), { recursive: true });

  for (const skill of gatesSkills) {
    await mkdir(join(root, 'harness', 'gates', 'skills', skill), { recursive: true });
    await writeFile(join(root, 'harness', 'gates', 'skills', skill, 'SKILL.md'), '', 'utf8');
  }

  for (const skill of workflowSkills) {
    await mkdir(join(root, 'harness', 'workflow', 'skills', skill), { recursive: true });
    await writeFile(join(root, 'harness', 'workflow', 'skills', skill, 'SKILL.md'), '', 'utf8');
  }

  return root;
}

describe('the skills a harness ships', () => {
  it('names every skill the gates bundle carries', async () => {
    const root = await repositoryShipping(['tdd', 'gates'], []);

    expect((await harnessSkillsOf(root)).toSorted()).toStrictEqual(['gates', 'tdd']);
  });

  it('names every skill the workflow bundle carries, even when the gates bundle carries none', async () => {
    const root = await repositoryShipping([], ['stages']);

    expect(await harnessSkillsOf(root)).toStrictEqual(['stages']);
  });

  it('names a skill from each bundle as one shipped list, not one or the other', async () => {
    const root = await repositoryShipping(['tdd', 'gates'], ['stages']);

    expect((await harnessSkillsOf(root)).toSorted()).toStrictEqual(['gates', 'stages', 'tdd']);
  });

  it('counts a skill both bundles ship once, not twice', async () => {
    const root = await repositoryShipping(['shared'], ['shared']);

    expect(await harnessSkillsOf(root)).toStrictEqual(['shared']);
  });

  it('names no skill for a loose file sitting beside them', async () => {
    const root = await repositoryShipping(['tdd'], []);

    await writeFile(join(root, 'harness', 'gates', 'skills', 'README.md'), '', 'utf8');

    expect(await harnessSkillsOf(root)).toStrictEqual(['tdd']);
  });

  it('refuses a repository with no harness, naming the gates directory it looked in first', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-harness-'));

    await expect(harnessSkillsOf(root)).rejects.toThrow(join(root, 'harness', 'gates', 'skills'));
  });

  it('refuses a repository missing only the workflow bundle, naming that directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-harness-'));

    await mkdir(join(root, 'harness', 'gates', 'skills'), { recursive: true });

    await expect(harnessSkillsOf(root)).rejects.toThrow(
      join(root, 'harness', 'workflow', 'skills'),
    );
  });
});
