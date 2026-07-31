import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WEB_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

// The hook arms one job for a policy rather than a gate: a branch check has no
// script to run and nothing to measure.
const NOT_A_GATE = 'protect-main';

async function commitJobsItWrites(): Promise<string[]> {
  const written = await readsPresetFile('lefthook.yml');
  const upToCommitMsg = written.slice(0, written.indexOf('commit-msg:'));

  return [...upToCommitMsg.matchAll(/- name: (\S+)/gu)].map(([, job]) => job ?? '');
}

describe('the gate chain the web preset arms at commit time', () => {
  it('claims every job the hook file runs, so no gate hides from the chain', async () => {
    const claimed = new Set(WEB_SEMANTICS.gates.map((gate) => gate.commitJob));
    const unclaimed = (await commitJobsItWrites()).filter(
      (job) => job !== NOT_A_GATE && !claimed.has(job),
    );

    expect(unclaimed).toStrictEqual([]);
  });
});

describe('what the web preset declares about a project', () => {
  it('spreads a slice across the layers Feature-Sliced Design names', () => {
    expect(WEB_SEMANTICS.slice.roots).toStrictEqual([
      'src/pages/{slice}',
      'src/widgets/{slice}',
      'src/features/{slice}',
      'src/entities/{slice}',
    ]);
  });

  it('calls what renders and what talks outward the adapters of a slice', () => {
    expect(WEB_SEMANTICS.slice.adapters).toStrictEqual(['ui/**', 'api/**']);
  });

  it('drives acceptance through a browser, not a built binary', () => {
    expect(WEB_SEMANTICS.acceptance).toStrictEqual({ runner: 'playwright', drives: 'browser' });
  });

  it('runs the domain suite on its own project, so a browser test stays out of it', () => {
    expect(WEB_SEMANTICS.scripts['test']).toBe('vitest run --project domain');
  });

  it('checks the layering with the tool that knows the layers', () => {
    expect(WEB_SEMANTICS.scripts['lint:boundaries']).toBe('steiger src --fail-on-warnings');
  });

  it('ends a stage on the layering, since a slice can only drift across layers', () => {
    expect(WEB_SEMANTICS.rings.two.map((check) => check.runs)).toContain(
      'steiger src --fail-on-warnings',
    );
  });
});

describe('the rings the web preset closes a write and a stage with', () => {
  it('formats the file before any check reads it', () => {
    expect(WEB_SEMANTICS.rings.formats).toStrictEqual([{ runs: 'oxfmt', scope: 'file' }]);
  });

  it('runs the linter over the written file alone, which is what keeps a write cheap', () => {
    expect(WEB_SEMANTICS.rings.one).toContainEqual({
      runs: 'oxlint --no-error-on-unmatched-pattern',
      scope: 'file',
    });
  });

  it('runs the domain suite over the tests that cover the written file', () => {
    expect(WEB_SEMANTICS.rings.one).toContainEqual({
      runs: 'vitest run --project domain',
      scope: 'covering',
    });
  });

  it('holds the typechecker back to the end of a stage, where a write no longer waits', () => {
    expect(WEB_SEMANTICS.rings.two).toContainEqual({
      runs: 'tsc --noEmit -p tsconfig.json',
      scope: 'project',
    });
  });
});
