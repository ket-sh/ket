import { describe, expect, it } from 'vitest';

import { citationsFrom, missingFrom } from './citations.ts';

describe('what a fence hides and what it does not', () => {
  it('reads the prose after a closed fence, keeping the lines apart', () => {
    const markdown = [
      'Before `src/a.ts`.',
      '```',
      'inside `src/hidden.ts`',
      '```',
      'After `src/b.ts`.',
      'Then `src/c.ts`.',
    ].join('\n');

    expect(citationsFrom(markdown).paths).toStrictEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });

  it('closes a fence only on a line that opens with the fence, not one that merely ends with it', () => {
    const markdown = [
      '```',
      'inside `src/hidden.ts`',
      'a line that ends in a fence ```',
      'still inside `src/also-hidden.ts`',
      '```',
      'After `src/b.ts`.',
    ].join('\n');

    expect(citationsFrom(markdown).paths).toStrictEqual(['src/b.ts']);
  });

  it('reads nothing from a path standing on its own line, since prose is not a claim', () => {
    expect(citationsFrom('src/outside.ts\nsee `src/cited.ts`').paths).toStrictEqual([
      'src/cited.ts',
    ]);
  });

  it('never joins a span across two lines, since a backtick closes on the line it opened', () => {
    const markdown = ['```', 'x', '```', 'see `src/a.ts', 'src/b.ts` end'].join('\n');

    expect(citationsFrom(markdown).paths).toStrictEqual(['src/a.ts']);
  });

  it('reads what a backtick opens, never the prose around it', () => {
    expect(
      citationsFrom('the file src/loose.ts sits beside `src/cited.ts` here').paths,
    ).toStrictEqual(['src/cited.ts']);
  });

  it('reads nothing from a pair of backticks with nothing between them', () => {
    expect(citationsFrom('an empty span `` and `src/cited.ts`').paths).toStrictEqual([
      'src/cited.ts',
    ]);
  });
});

describe('a digit inside a name', () => {
  it('reads a symbol carrying a digit', () => {
    expect(citationsFrom('the `parseV2Item()` reader').symbols).toStrictEqual(['parseV2Item']);
  });

  it('does not find a symbol where a digit runs on past it', () => {
    expect(
      missingFrom({
        read: [{ path: 'a.ts', contents: 'export const runNow2 = 1;' }],
        symbols: ['runNow'],
      }).symbols,
    ).toStrictEqual(['runNow']);
  });

  it('finds a symbol a digit precedes only across a boundary', () => {
    expect(
      missingFrom({ read: [{ path: 'a.ts', contents: 'const x2 = runNow;' }], symbols: ['runNow'] })
        .symbols,
    ).toStrictEqual([]);
  });
});

describe('a token that is not code', () => {
  it('reads no symbol from a name whose only case change follows a digit', () => {
    expect(citationsFrom('the `x2Y` value').symbols).toStrictEqual([]);
  });

  it('reads no symbol from a name that is capitals throughout', () => {
    expect(citationsFrom('the `AB` value').symbols).toStrictEqual([]);
  });
});

describe('what counts as an identifier', () => {
  it('reads a symbol that opens with a dollar', () => {
    expect(citationsFrom('the `$queryRaw` call').symbols).toStrictEqual(['$queryRaw']);
  });

  it('reads no symbol from a token carrying a hyphen, which no identifier may', () => {
    expect(citationsFrom('the `x_a-b` value').symbols).toStrictEqual([]);
  });

  it('reads no symbol from a token that opens with a digit', () => {
    expect(citationsFrom('the `2ndTry` value').symbols).toStrictEqual([]);
  });

  it('reads no symbol from a pair of backticks holding nothing', () => {
    expect(citationsFrom('an empty `` span').symbols).toStrictEqual([]);
  });
});
