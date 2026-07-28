import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCommand } from './run.ts';

describe('the ket command line', () => {
  it('refuses to initialize a directory outside any git repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'ket-'));

    await expect(runCommand('init', ['--cwd', outside])).rejects.toThrow(/git repository/);
  });

  it('names the command it was asked for when that command does not exist', async () => {
    await expect(runCommand('deploy', [])).rejects.toThrow(/deploy/);
  });
});
