import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { refuseShadcnPreset } from './shadcn.ts';

const anEmittedCode = fc.stringMatching(/^[ab][0-9A-Za-z]{1,9}$/u);

const anAlienCharacter = fc.constantFrom('_', '-', '.', ' ', '/', '!', 'ç');

function acceptsTheCode(code: string): void {
  expect(refuseShadcnPreset(code)).toBeUndefined();
}

function refusesTheCode(code: string): void {
  expect(refuseShadcnPreset(code)).toBe(
    `${code} is not a shadcn preset code. Copy yours from ui.shadcn.com/create`,
  );
}

describe('the shadcn preset code gate, over arbitrary input', () => {
  it('accepts every code the official builder could emit', () => {
    fc.assert(fc.property(anEmittedCode, acceptsTheCode));
  });

  it('refuses every code carrying a character outside base62', () => {
    fc.assert(
      fc.property(anEmittedCode, anAlienCharacter, fc.nat(9), (code, alien, at) => {
        refusesTheCode(`${code.slice(0, at % code.length)}${alien}${code.slice(at % code.length)}`);
      }),
    );
  });
});
