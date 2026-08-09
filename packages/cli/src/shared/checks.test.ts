import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { failuresAmong, localBinsOf } from './checks.ts';

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-checks-'));
}

describe('reading the shims a project keeps in its bin directory', () => {
  it('names every shim the directory holds', async () => {
    const root = await scratch();
    const bins = join(root, 'node_modules', '.bin');

    await mkdir(bins, { recursive: true });
    await writeFile(join(bins, 'vitest'), '');
    await writeFile(join(bins, 'stryker'), '');

    expect(await localBinsOf(root)).toStrictEqual(new Set(['vitest', 'stryker']));
  });

  it('answers empty for a project with no bin directory, so the PATH answers instead', async () => {
    expect(await localBinsOf(await scratch())).toStrictEqual(new Set());
  });
});

const PASSES = ['/bin/sh', '-c', 'exit 0'];

const FAILS = ['/bin/sh', '-c', 'echo boom >&2; exit 1'];

describe('running the checks that end a stage', () => {
  it('reports nothing when every check passed', async () => {
    const failures = await failuresAmong(await scratch(), [
      { runs: 'tsc', argv: PASSES },
      { runs: 'depcruise', argv: PASSES },
    ]);

    expect(failures).toStrictEqual([]);
  });

  it('names the check that failed and what it said', async () => {
    const failures = await failuresAmong(await scratch(), [{ runs: 'tsc', argv: FAILS }]);

    expect(failures).toStrictEqual([{ runs: 'tsc', said: 'boom' }]);
  });

  it('reports every check that failed, not only the first', async () => {
    const failures = await failuresAmong(await scratch(), [
      { runs: 'tsc', argv: FAILS },
      { runs: 'depcruise', argv: PASSES },
      { runs: 'vitest run', argv: FAILS },
    ]);

    expect(failures.map((failure) => failure.runs)).toStrictEqual(['tsc', 'vitest run']);
  });

  it('reports a check whose binary is not installed rather than passing it', async () => {
    const failures = await failuresAmong(await scratch(), [
      { runs: 'stryker run', argv: ['./node_modules/.bin/stryker', 'run'] },
    ]);

    expect(failures.map((failure) => failure.runs)).toStrictEqual(['stryker run']);
  });
});
