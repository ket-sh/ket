import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCommand } from './run.ts';

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-'));
}

describe('the ket command line', () => {
  it('creates a project where it was told to', async () => {
    const where = join(await scratch(), 'order-service');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.ket/config.ts'), 'utf8')).resolves.toContain("key: 'OS'");
  });

  it('makes the project a repository, since .ket lives at a git root', async () => {
    const where = join(await scratch(), 'billing-gateway');

    await runCommand('create', [where]);

    await expect(readFile(join(where, '.git', 'HEAD'), 'utf8')).resolves.toContain('ref:');
  });

  it('refuses a directory that already holds something', async () => {
    const where = join(await scratch(), 'taken');

    await mkdir(where);
    await writeFile(join(where, 'README.md'), 'mine\n');

    await expect(runCommand('create', [where])).rejects.toThrow(/not empty/);
  });

  it('writes nothing when it cannot settle a configuration without asking', async () => {
    const where = join(await scratch(), '2026');

    await expect(runCommand('create', [where])).rejects.toThrow(/nothing was configured/);
  });

  it('names the command it was asked for when that command does not exist', async () => {
    await expect(runCommand('deploy', [])).rejects.toThrow(/deploy/);
  });
});
