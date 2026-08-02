import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { welcomeTo } from './welcome.ts';

describe('what a welcome always does', () => {
  it('opens with a welcome and closes with a period', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), (name) => {
        expect(welcomeTo(name)).toMatch(/^Welcome to .+\.$/su);
      }),
    );
  });

  it('carries the name whenever the name has something in it', () => {
    fc.assert(
      fc.property(
        fc.string().filter((name) => name.trim() !== ''),
        (name) => {
          expect(welcomeTo(name)).toContain(name.trim());
        },
      ),
    );
  });
});
