import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { RingFailure } from './ring.ts';

export interface PlannedCheck {
  runs: string;
  argv: string[];
}

// A project without a readable bin directory holds no shims, so every check
// resolves from the PATH, which is what a spawn would have answered anyway.
export async function localBinsOf(root: string): Promise<Set<string>> {
  const names = await readdir(join(root, 'node_modules', '.bin')).catch((): string[] => []);

  return new Set(names);
}

async function saidBy(argv: string[], root: string): Promise<string | undefined> {
  return new Promise((settle) => {
    const [binary, ...rest] = argv;
    const child = spawn(binary ?? '', rest, { cwd: root });
    let told = '';

    const gather = (chunk: Buffer): void => {
      told += chunk.toString();
    };

    child.stdout.on('data', gather);
    child.stderr.on('data', gather);
    child.on('error', (cause: Error) => {
      settle(cause.message);
    });

    child.on('close', (code) => {
      settle(code === 0 ? undefined : told.trim());
    });
  });
}

export async function failuresAmong(root: string, planned: PlannedCheck[]): Promise<RingFailure[]> {
  const failures: RingFailure[] = [];

  for (const check of planned) {
    const told = await saidBy(check.argv, root);

    if (told !== undefined) {
      failures.push({ runs: check.runs, said: told });
    }
  }

  return failures;
}
