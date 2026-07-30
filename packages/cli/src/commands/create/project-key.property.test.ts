import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { deriveProjectKey } from './project-key.ts';

describe('deriving a project key, over arbitrary names', () => {
  it('either reports no key or produces two to ten capital letters', () => {
    fc.assert(
      fc.property(fc.string(), (repositoryName) => {
        const key = deriveProjectKey(repositoryName);

        if (key !== undefined) {
          expect(key).toMatch(/^[A-Z]{2,10}$/);
        }
      }),
    );
  });

  it('builds the key only out of letters the name already carries', () => {
    fc.assert(
      fc.property(fc.string(), (repositoryName) => {
        const key = deriveProjectKey(repositoryName);
        const available = repositoryName.toUpperCase();

        for (const letter of key ?? '') {
          expect(available).toContain(letter);
        }
      }),
    );
  });

  it('reports no key for a name that carries no run of two letters', () => {
    fc.assert(
      fc.property(
        fc.string().filter((name) => !/[a-zA-Z]{2}/.test(name)),
        (repositoryName) => {
          expect(deriveProjectKey(repositoryName)).toBeUndefined();
        },
      ),
    );
  });
});
