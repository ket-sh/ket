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
    const output = captureStdout();

    await runMain(['create', '--help']);

    expect(output()).toContain('Where the project goes');
    expect(output()).not.toContain('created');
  });
});
