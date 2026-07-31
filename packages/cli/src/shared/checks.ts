import { spawn } from 'node:child_process';

import type { RingFailure } from './ring.ts';

export interface PlannedCheck {
  runs: string;
  argv: string[];
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
