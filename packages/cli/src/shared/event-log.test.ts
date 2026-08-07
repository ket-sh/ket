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
  it('reads back the decision it wrote, stamped with the given moment', async () => {
    const root = await repository();

    await record(
      root,
      { gate: 'write', outcome: 'refused', about: 'src/auth.ts' },
      '2026-08-07T10:00:00.000Z',
    );

    await expect(readLog(root)).resolves.toBe(
      '{"gate":"write","outcome":"refused","about":"src/auth.ts","at":"2026-08-07T10:00:00.000Z"}\n',
    );
  });

  it('stamps the moment itself when nobody supplies one', async () => {
    const root = await repository();

    await record(root, { gate: 'write', outcome: 'allowed', about: 'src/auth.ts' });

    const written: unknown = JSON.parse((await readLog(root)).trim());
    const at: unknown =
      written !== null && typeof written === 'object' ? Reflect.get(written, 'at') : undefined;

    expect(typeof at).toBe('string');
    expect(Number.isNaN(Date.parse(String(at)))).toBe(false);
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
