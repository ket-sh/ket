import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { KET_VERSION } from './version.ts';

describe('the version ket answers for itself', () => {
  it('matches the manifest of the package that ships it', async () => {
    const manifest: unknown = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    );
    const declared: unknown =
      manifest !== null && typeof manifest === 'object' ? Reflect.get(manifest, 'version') : '';

    expect(KET_VERSION).toBe(declared);
  });
});
