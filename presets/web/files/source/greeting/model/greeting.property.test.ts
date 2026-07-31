import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { greeting } from './greeting.ts';

describe('what a greeting always does', () => {
  it('opens with hello whatever it was given', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), (who) => {
        expect(greeting(who)).toMatch(/^hello /u);
      }),
    );
  });

  it('carries the name whenever the name has something in it', () => {
    fc.assert(
      fc.property(
        fc.string().filter((who) => who.trim() !== ''),
        (who) => {
          expect(greeting(who)).toContain(who.trim());
        },
      ),
    );
  });
});
