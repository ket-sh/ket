import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const HARNESS_SKILLS = join('harness', 'skills');

export async function harnessSkillsOf(root: string): Promise<string[]> {
  const entries = await readdir(join(root, HARNESS_SKILLS), { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
