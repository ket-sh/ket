import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fateOf, hashOf } from './scaffold-manifest.ts';

const someBytes = fc.string();

describe('the invariants a fate keeps', () => {
  it('never holds a file the user left as written', () => {
    fc.assert(
      fc.property(someBytes, someBytes, (written, shipped) => {
        const recorded = hashOf(written);

        expect(['settled', 'refreshed']).toContain(fateOf(recorded, recorded, hashOf(shipped)));
      }),
    );
  });

  it('never writes over bytes that are neither recorded nor shipped', () => {
    fc.assert(
      fc.property(
        fc.option(someBytes, { nil: undefined }),
        someBytes,
        someBytes,
        (written, edited, shipped) => {
          const recorded = written === undefined ? undefined : hashOf(written);
          const disk = hashOf(`edited: ${edited}`);

          fc.pre(disk !== recorded && disk !== hashOf(shipped));
          expect(fateOf(recorded, disk, hashOf(shipped))).toBe('held');
        },
      ),
    );
  });

  it('never rewrites a file that already carries the shipped bytes', () => {
    fc.assert(
      fc.property(fc.option(someBytes, { nil: undefined }), someBytes, (written, shipped) => {
        const recorded = written === undefined ? undefined : hashOf(written);
        const fresh = hashOf(shipped);

        expect(['settled', 'converged']).toContain(fateOf(recorded, fresh, fresh));
      }),
    );
  });
});
