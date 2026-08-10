import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Configuration } from '../../shared/configuration.ts';

import { manifestFileOf, manifestSourceFor } from '../../shared/scaffold/manifest.ts';
import { plannedMergesOf, plannedMigrationOf } from './merges.ts';

const BARE_CONFIGURATION: Configuration = {
  key: 'STOR',
  targets: {},
  integrations: [],
  language: 'en',
  workflow: false,
};

async function rootHolding(manifest: string | undefined): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-merges-'));

  if (manifest !== undefined) {
    await writeFile(join(root, 'package.json'), manifest);
  }

  return root;
}

describe('the merges an update plans', () => {
  it('plans nothing where the project already holds everything', async () => {
    const fresh = manifestFileOf('', 'app', manifestSourceFor(BARE_CONFIGURATION));

    if (fresh === undefined || 'refused' in fresh) {
      throw new Error('expected a fresh manifest');
    }

    const root = await rootHolding(fresh.contents);

    await expect(plannedMergesOf(root, BARE_CONFIGURATION, 'app')).resolves.toStrictEqual({
      files: [],
      refusals: [],
    });
  });
});

describe('the migration an update plans', () => {
  it('carries the migrated settings where an old plugin name stands', async () => {
    const root = await rootHolding(undefined);

    await mkdir(join(root, '.claude'));
    await writeFile(
      join(root, '.claude', 'settings.json'),
      JSON.stringify({ enabledPlugins: { 'ket@ket': true } }),
    );

    const migration = await plannedMigrationOf(root);

    expect(migration?.path).toBe('.claude/settings.json');
    expect(migration?.contents).toContain('ket-gates@ket');
  });
});
