import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readLog, record } from './event-log.ts';

async function repository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-'));

  await mkdir(join(root, '.ket'), { recursive: true });

  return root;
}

describe('recording what a gate decided', () => {
  it('reads back the decision it wrote', async () => {
    const root = await repository();

    await record(root, { gate: 'write', outcome: 'refused', about: 'src/auth.ts' });

    await expect(readLog(root)).resolves.toBe(
      '{"gate":"write","outcome":"refused","about":"src/auth.ts"}\n',
    );
  });

  it('appends, since the log is a history rather than the latest answer', async () => {
    const root = await repository();

    await record(root, { gate: 'write', outcome: 'allowed', about: 'src/auth.ts' });
    await record(root, { gate: 'shell', outcome: 'refused', about: 'git push' });

    const lines = (await readLog(root)).split('\n').filter((line) => line !== '');

    expect(lines).toHaveLength(2);
  });

  it('reads an empty log where no gate has decided anything yet', async () => {
    await expect(readLog(await repository())).resolves.toBe('');
  });
});
