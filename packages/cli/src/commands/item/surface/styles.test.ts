import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DIFF_STYLES, GRID_STYLES, SURFACE_STYLES } from './styles.generated.ts';

const resolveModulePath = createRequire(import.meta.url).resolve;

function shippedBy(specifier: string): string {
  return readFileSync(resolveModulePath(specifier), 'utf8');
}

describe('the chrome the compiled binary carries within itself', () => {
  it('carries the diff styles the dependency ships today', () => {
    expect(DIFF_STYLES).toBe(shippedBy('diff2html/bundles/css/diff2html.min.css'));
  });

  it('carries the grid styles the dependency ships today', () => {
    expect(GRID_STYLES).toBe(shippedBy('gridstack/dist/gridstack.min.css'));
  });

  it('carries the surface styles beside the source', () => {
    expect(SURFACE_STYLES).toBe(
      readFileSync(fileURLToPath(new URL('surface.css', import.meta.url)), 'utf8'),
    );
  });

  it('carries the grid script the dependency ships today', async () => {
    const { GRID_SCRIPT } = await import('./styles.generated.ts');

    expect(GRID_SCRIPT).toBe(shippedBy('gridstack/dist/gridstack-all.js'));
  });

  it('carries a browser client bundled from the sources beside it', async () => {
    const { CLIENT_SCRIPT } = await import('./styles.generated.ts');

    expect(CLIENT_SCRIPT).toContain('wireAudience');
  });

  it('carries the fingerprint of the client sources it bundled', async () => {
    const { CLIENT_FINGERPRINT } = await import('./styles.generated.ts');
    const clientDir = fileURLToPath(new URL('client', import.meta.url));
    const digest = createHash('sha256');

    for (const name of readdirSync(clientDir)
      .filter((held) => held.endsWith('.ts') && !held.includes('.test.'))
      .sort()) {
      digest.update(name);
      digest.update(
        readFileSync(fileURLToPath(new URL(`client/${name}`, import.meta.url)), 'utf8'),
      );
    }

    expect(CLIENT_FINGERPRINT).toBe(digest.digest('hex'));
  });
});
