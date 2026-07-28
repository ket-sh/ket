import fc from 'fast-check';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findRepositoryRoot } from './repository.ts';

const directoryName = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/).filter((name) => name !== '.git');

describe('resolving the repository root, over arbitrary trees', () => {
  it('returns the directory holding .git from any depth below it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(directoryName, { minLength: 1, maxLength: 8 }),
        async (segments) => {
          const base = await mkdtemp(join(tmpdir(), 'ket-'));

          await mkdir(join(base, '.git'));
          await mkdir(join(base, ...segments), { recursive: true });

          expect(await findRepositoryRoot(join(base, ...segments))).toBe(base);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('never returns a directory that is not an ancestor of where it started', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(directoryName, { minLength: 1, maxLength: 8 }),
        async (segments) => {
          const base = await mkdtemp(join(tmpdir(), 'ket-'));
          const start = join(base, ...segments);

          await mkdir(start, { recursive: true });

          const root = await findRepositoryRoot(start);

          if (root !== undefined) {
            expect(start.startsWith(root)).toBe(true);
          }
        },
      ),
      { numRuns: 25 },
    );
  });
});
