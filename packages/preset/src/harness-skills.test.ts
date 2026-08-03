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

async function sortedBundles(root: string): Promise<{ gates: string[]; workflow: string[] }> {
  const shipped = await harnessSkillsOf(root);

  return { gates: shipped.gates.toSorted(), workflow: shipped.workflow.toSorted() };
}

describe('the skills a harness ships', () => {
  it('names every skill the gates bundle carries', async () => {
    const root = await repositoryShipping(['tdd', 'gates'], []);

    expect(await sortedBundles(root)).toStrictEqual({ gates: ['gates', 'tdd'], workflow: [] });
  });

  it('names every skill the workflow bundle carries, even when the gates bundle carries none', async () => {
    const root = await repositoryShipping([], ['stages']);

    expect(await harnessSkillsOf(root)).toStrictEqual({ gates: [], workflow: ['stages'] });
  });

  it('keeps each bundle its own list, since only one of them reaches every project', async () => {
    const root = await repositoryShipping(['tdd', 'gates'], ['stages']);

    expect(await sortedBundles(root)).toStrictEqual({
      gates: ['gates', 'tdd'],
      workflow: ['stages'],
    });
  });

  it('names a skill both bundles ship in both, keeping the distinction', async () => {
    const root = await repositoryShipping(['shared'], ['shared']);

    expect(await harnessSkillsOf(root)).toStrictEqual({ gates: ['shared'], workflow: ['shared'] });
  });

  it('names no skill for a loose file sitting beside them', async () => {
    const root = await repositoryShipping(['tdd'], []);

    await writeFile(join(root, 'harness', 'gates', 'skills', 'README.md'), '', 'utf8');

    expect(await harnessSkillsOf(root)).toStrictEqual({ gates: ['tdd'], workflow: [] });
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
