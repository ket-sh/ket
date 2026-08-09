import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WEB_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

describe('the mutation gate the web preset arms against a change', () => {
  it('retests the change, never the whole repository', () => {
    expect(WEB_SEMANTICS.scripts['test:mutation']).toBe('bun scripts/mutate-changed.mts');
  });

  it('keeps the whole battery one script away', () => {
    expect(WEB_SEMANTICS.scripts['test:mutation:full']).toBe('stryker run');
  });
});

describe('the pipeline the web preset writes for the mutation gate', () => {
  it('retests a pull request against its merge base alone', async () => {
    expect(await readsPresetFile('github-ci.yml')).toContain(
      [
        '      - name: Retest what changed against the merge base',
        "        if: github.event_name == 'pull_request'",
        '        run: bun run test:mutation',
      ].join('\n'),
    );
  });

  it('retests everything on a push to main, so scoping opens no hole', async () => {
    expect(await readsPresetFile('github-ci.yml')).toContain(
      [
        '      - name: Retest everything, since main anchors the scoped runs',
        "        if: github.event_name == 'push'",
        '        run: bun run test:mutation:full',
      ].join('\n'),
    );
  });

  it('reads the history the merge base lives in', async () => {
    const pipeline = await readsPresetFile('github-ci.yml');
    const mutation = pipeline.slice(pipeline.indexOf('  mutation:'));

    expect(mutation).toContain('fetch-depth: 0');
  });

  it('leans on no incremental cache, since a missing cache degrades silently', async () => {
    const pipeline = await readsPresetFile('github-ci.yml');

    expect(pipeline).not.toContain('--incremental');
    expect(pipeline).not.toContain('actions/cache');
  });

  it('retests everything weekly, so nothing hides from the scoped runs for long', async () => {
    const weekly = await readsPresetFile('github-mutation-weekly.yml');

    expect(weekly).toContain('run: bun run test:mutation:full');
    expect(weekly).not.toContain('--incremental');
    expect(weekly).not.toContain('actions/cache');
  });
});
