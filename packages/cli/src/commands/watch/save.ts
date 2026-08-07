import { writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import { record } from '../../shared/event-log.ts';

const KET_DIRECTORY = '.ket';

export async function writeCriteria(
  root: string,
  key: string,
  name: string,
  source: string,
): Promise<void> {
  if (!name.endsWith('.feature')) {
    throw new Error(`${name} is not criteria: only a .feature file lands in an item`);
  }

  const itemDir = resolve(root, KET_DIRECTORY, 'items', key);
  const target = resolve(itemDir, name);

  if (!target.startsWith(itemDir + sep)) {
    throw new Error(`${name} does not resolve inside the ${key} item directory`);
  }

  await writeFile(target, source, 'utf8');
  await record(root, {
    gate: 'write',
    outcome: 'allowed',
    about: join(KET_DIRECTORY, 'items', key, name),
    item: key,
  });
}
