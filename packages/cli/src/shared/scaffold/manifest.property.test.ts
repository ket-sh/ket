import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ManifestSource } from './manifest.ts';

import { isRecord } from './held.ts';
import { manifestFileOf } from './manifest.ts';

const NAME = fc.string({ minLength: 1, maxLength: 12 });

const RANGE = fc.string({ minLength: 1, maxLength: 8 });

const BLOCK = fc.dictionary(NAME, RANGE, { maxKeys: 6 });

const PIN = fc.tuple(NAME, RANGE).map(([name, range]) => `${name}@${range}`);

const HELD = fc.record({
  name: NAME,
  scripts: BLOCK,
  dependencies: BLOCK,
  devDependencies: BLOCK,
});

const SOURCE: fc.Arbitrary<ManifestSource> = fc.record({
  dependencies: fc.array(PIN, { maxLength: 6 }),
  devDependencies: fc.array(PIN, { maxLength: 6 }),
  scripts: BLOCK,
});

function blockOf(manifest: unknown, field: string): Record<string, unknown> {
  if (!isRecord(manifest)) {
    return {};
  }

  const held = manifest[field];

  return isRecord(held) ? held : {};
}

function afterMerging(
  held: Record<string, unknown>,
  name: string,
  source: ManifestSource,
): unknown {
  const merged = manifestFileOf(JSON.stringify(held), name, source);

  if (merged === undefined || 'refused' in merged) {
    return held;
  }

  return JSON.parse(merged.contents);
}

const FIELDS = ['scripts', 'dependencies', 'devDependencies'];

describe('merging a manifest, over arbitrary manifests and sources', () => {
  it('never changes an entry the project already holds', () => {
    fc.assert(
      fc.property(HELD, NAME, SOURCE, (held, name, source) => {
        const after = afterMerging(held, name, source);

        for (const field of FIELDS) {
          for (const [entry, range] of Object.entries(blockOf(held, field))) {
            expect(blockOf(after, field)[entry]).toBe(range);
          }
        }
      }),
    );
  });

  it('leaves the project named as it named itself', () => {
    fc.assert(
      fc.property(HELD, NAME, SOURCE, (held, name, source) => {
        const after = afterMerging(held, name, source);

        expect(isRecord(after) ? after['name'] : undefined).toBe(held.name);
      }),
    );
  });

  it('carries every name the configuration declares', () => {
    fc.assert(
      fc.property(HELD, NAME, SOURCE, (held, name, source) => {
        const after = afterMerging(held, name, source);

        for (const pin of source.dependencies) {
          expect(
            Object.hasOwn(blockOf(after, 'dependencies'), pin.slice(0, pin.lastIndexOf('@'))),
          ).toBe(true);
        }
      }),
    );
  });
});
