import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { refuseName } from './name.ts';

const aSafePiece = fc.stringMatching(/^[a-z0-9-]{0,8}$/u);

const aCuttingCharacter = fc.constantFrom("'", '"', '\\', ' ', ';', '$', '`', '{', '}');

const aSafeName = fc.stringMatching(/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,19}$/u);

function refusesTheCut(head: string, cut: string, tail: string): void {
  expect(refuseName(`${head}${cut}${tail}`)).toBeDefined();
}

function acceptsTheName(name: string): void {
  expect(refuseName(name)).toBeUndefined();
}

describe('the names create lets into a scaffolded file, over arbitrary input', () => {
  it('refuses every name carrying a character that could cut the file around it', () => {
    fc.assert(fc.property(aSafePiece, aCuttingCharacter, aSafePiece, refusesTheCut));
  });

  it('accepts every name of letters, digits, dots, underscores, and dashes', () => {
    fc.assert(fc.property(aSafeName, acceptsTheName));
  });
});
