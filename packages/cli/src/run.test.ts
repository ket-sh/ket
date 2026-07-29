import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCommand } from './run.ts';

describe('the ket command line', () => {
  it('refuses to initialize a directory outside any git repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'ket-'));

    await expect(runCommand('init', ['--cwd', outside])).rejects.toThrow(/git repository/);
  });

  it('writes the ket directory into a repository that has none', async () => {
    const base = await mkdtemp(join(tmpdir(), 'ket-'));
    const repository = join(base, 'order-fulfilment-service');

    await mkdir(join(repository, '.git'), { recursive: true });
    await runCommand('init', ['--cwd', repository]);

    await expect(readFile(join(repository, '.ket/config.ts'), 'utf8')).resolves.toContain(
      "key: 'OFS'",
    );
  });

  it('writes nothing when it cannot settle a configuration without asking', async () => {
    const base = await mkdtemp(join(tmpdir(), 'ket-'));
    const repository = join(base, '2026');

    await mkdir(join(repository, '.git'), { recursive: true });

    await expect(runCommand('init', ['--cwd', repository])).rejects.toThrow(
      /nothing was configured/,
    );
  });

  it('refuses a repository it has already configured', async () => {
    const base = await mkdtemp(join(tmpdir(), 'ket-'));
    const repository = join(base, 'order-fulfilment-service');

    await mkdir(join(repository, '.git'), { recursive: true });
    await mkdir(join(repository, '.ket'), { recursive: true });

    await expect(runCommand('init', ['--cwd', repository])).rejects.toThrow(/already/);
  });

  it('names the command it was asked for when that command does not exist', async () => {
    await expect(runCommand('deploy', [])).rejects.toThrow(/deploy/);
  });
});
