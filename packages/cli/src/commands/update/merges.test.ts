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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutName(contents: string): string {
  const held: unknown = JSON.parse(contents);

  if (!isRecord(held)) {
    throw new Error('expected a manifest record');
  }

  const trimmed = Object.fromEntries(Object.entries(held).filter(([field]) => field !== 'name'));

  return `${JSON.stringify(trimmed, undefined, 2)}\n`;
}

describe('the merges an update plans', () => {
  it('plans the manifest merge and carries no refusal beside it', async () => {
    const fresh = manifestFileOf('', 'app', manifestSourceFor(BARE_CONFIGURATION));

    if (fresh === undefined || 'refused' in fresh) {
      throw new Error('expected a fresh manifest');
    }

    const root = await rootHolding(withoutName(fresh.contents));
    const planned = await plannedMergesOf(root, BARE_CONFIGURATION, 'app');

    expect(planned.refusals).toStrictEqual([]);
    expect(planned.files.map((file) => file.path)).toStrictEqual(['package.json']);
  });

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
