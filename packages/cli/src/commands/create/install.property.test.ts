import { copies } from '@ket/preset';
import fc from 'fast-check';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import { scaffolded } from './install.ts';

describe('copying bytes into a project, over arbitrary names and payloads', () => {
  it('never lets a project name or key reach into the base64 payload', () => {
    fc.assert(
      fc.property(fc.uint8Array(), fc.string(), fc.string(), (raw, name, key) => {
        const carried = Buffer.from(raw).toString('base64');

        const installed = scaffolded(copies('hero/bg.mp4', 'public/bg.mp4'), carried, {
          name,
          key,
        });

        expect(installed.contents).toBe(carried);
        expect(installed.encoding).toBe('base64');
      }),
    );
  });
});
