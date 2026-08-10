import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { env } from 'node:process';
import { describe, expect, it } from 'vitest';

import { realBun } from '../vitest.toolbox-setup.ts';

async function resolvedFromPath(tool: string): Promise<string> {
  return new Promise((settle, refuse) => {
    execFile('/bin/sh', ['-c', `command -v ${tool}`], (failed, stdout) => {
      if (failed) {
        refuse(new Error(`${tool} resolved nowhere on PATH: ${failed.message}`));
      } else {
        settle(stdout.trim());
      }
    });
  });
}

function toolbox(): string {
  return env['KET_TOOLBOX'] ?? '';
}

describe('the toolbox every spawned installer resolves through', () => {
  it('answers for bunx before the machine can', async () => {
    await expect(resolvedFromPath('bunx')).resolves.toBe(join(toolbox(), 'bunx'));
  });

  it('answers for bun, keeping the real runtime aside for the specs that need it', async () => {
    const resolved = await resolvedFromPath('bun');

    expect(resolved).toBe(join(toolbox(), 'bun'));
    expect(resolved).not.toBe(realBun());
  });
});
