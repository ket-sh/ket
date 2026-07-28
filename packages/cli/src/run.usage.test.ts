import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runMain } from './run.ts';

function captureStdout(): () => string {
  const written: string[] = [];

  vi.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
    written.push(parts.join(' '));
  });

  return () => written.join('\n');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('asking a command for its usage', () => {
  it('describes the command instead of running it', async () => {
    const elsewhere = await mkdtemp(join(tmpdir(), 'ket-'));
    const output = captureStdout();

    await runMain(['init', '--cwd', elsewhere, '--help']);

    expect(output()).toContain('--cwd');
    expect(output()).not.toContain('project key');
  });
});
