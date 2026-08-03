import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const GATES_SKILLS = join('harness', 'gates', 'skills');

const WORKFLOW_SKILLS = join('harness', 'workflow', 'skills');

async function skillNamesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function harnessSkillsOf(root: string): Promise<string[]> {
  const gates = await skillNamesIn(join(root, GATES_SKILLS));
  const workflow = await skillNamesIn(join(root, WORKFLOW_SKILLS));

  return [...new Set([...gates, ...workflow])];
}
