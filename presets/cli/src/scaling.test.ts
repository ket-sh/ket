import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

describe('the mutation gate the cli preset arms against a change', () => {
  it('retests the change, never the whole repository', () => {
    expect(CLI_SEMANTICS.scripts['test:mutation']).toBe('bun scripts/mutate-changed.mts');
  });

  it('keeps the whole battery one script away', () => {
    expect(CLI_SEMANTICS.scripts['test:mutation:full']).toBe('stryker run');
  });

  it('typechecks the runner it ships, since an unchecked gate is a broken gate waiting', async () => {
    expect(await readsPresetFile('tsconfig.json')).toContain('"scripts/**/*.mts"');
  });
});

describe('the slow gates the cli preset arms beside the mutation gate', () => {
  it('checks types incrementally, so a clean look costs the change', async () => {
    expect(await readsPresetFile('tsconfig.json')).toContain('"incremental": true');
  });

  it('cruises the import graph off a content cache, as the web preset already does', () => {
    expect(CLI_SEMANTICS.scripts['lint:boundaries']).toBe(
      'depcruise src --config .dependency-cruiser.cjs --cache --cache-strategy content',
    );
  });

  it('ends a stage on the same cached cruise, since one decision takes one spelling', () => {
    expect(CLI_SEMANTICS.rings.two.map((check) => check.runs)).toContain(
      CLI_SEMANTICS.scripts['lint:boundaries'],
    );
  });

  it('arms the same cached cruise at commit', async () => {
    expect(await readsPresetFile('lefthook.yml')).toContain(
      'depcruise src --config .dependency-cruiser.cjs --cache --cache-strategy content',
    );
  });
});

describe('the pipeline the cli preset writes for the mutation gate', () => {
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
    expect(await readsPresetFile('github-ci.yml')).toContain('fetch-depth: 0');
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
