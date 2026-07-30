import { describe, expect, it } from 'vitest';

import { citationsFrom, missingFrom } from './citations.ts';

describe('the paths a design artifact cites', () => {
  it('reads a repository path inside backticks as a citation', () => {
    expect(
      citationsFrom('It changes `packages/cli/src/shared/write-gate.ts` first.'),
    ).toStrictEqual({ paths: ['packages/cli/src/shared/write-gate.ts'], symbols: [] });
  });

  it('reads a path that starts at a dot directory', () => {
    expect(citationsFrom('Read `.ket/config.ts` first.').paths).toStrictEqual(['.ket/config.ts']);
  });

  it('reads a cited directory, since a design names where a slice lands', () => {
    expect(citationsFrom('The slice lands in `packages/cli/src/commands/`.').paths).toStrictEqual([
      'packages/cli/src/commands/',
    ]);
  });

  it('cites each path once, however often the design repeats it', () => {
    expect(citationsFrom('`a/b.ts` then `a/b.ts` again').paths).toStrictEqual(['a/b.ts']);
  });

  it('reads every path on a line, not only the first', () => {
    expect(citationsFrom('`a/b.ts` calls `c/d.ts`.').paths).toStrictEqual(['a/b.ts', 'c/d.ts']);
  });

  it('cites nothing when the design backticks no path', () => {
    expect(citationsFrom('The item is `trivial` and the kind is `feature`.')).toStrictEqual({
      paths: [],
      symbols: [],
    });
  });
});

describe('what a design backticks that names no file in the repository', () => {
  it('leaves a bare file name alone, since a member expression looks the same', () => {
    expect(citationsFrom('It reads `config.ts` and `process.stdout`.').paths).toStrictEqual([]);
  });

  it('leaves a pattern alone, since a glob names no file to read', () => {
    expect(citationsFrom('It writes `features/*.feature`.').paths).toStrictEqual([]);
  });

  it('leaves a package specifier alone, since it names no file in the repository', () => {
    expect(citationsFrom('It imports `@ket/preset-cli`.').paths).toStrictEqual([]);
  });

  it('leaves a module specifier carrying a scheme alone', () => {
    expect(citationsFrom('It imports `node:fs/promises`.').paths).toStrictEqual([]);
  });

  it('leaves a slash command alone, since it names a command and not a path', () => {
    expect(citationsFrom('Run `/ket:approve` next.').paths).toStrictEqual([]);
  });

  it('leaves a command line alone, since a citation is one token', () => {
    expect(citationsFrom('Run `bun run --cwd packages/cli test`.').paths).toStrictEqual([]);
  });
});

describe('the symbols a design artifact cites', () => {
  it('reads a name that carries an inner capital as a symbol', () => {
    expect(citationsFrom('It calls `verdictFor` on the attempt.')).toStrictEqual({
      paths: [],
      symbols: ['verdictFor'],
    });
  });

  it('reads a type name the same way', () => {
    expect(citationsFrom('It returns a `WriteAttempt`.').symbols).toStrictEqual(['WriteAttempt']);
  });

  it('reads a call, and cites the name without the parentheses', () => {
    expect(citationsFrom('It calls `run()` last.').symbols).toStrictEqual(['run']);
  });

  it('reads a constant written in screaming snake case', () => {
    expect(citationsFrom('It reads `CLI_SEMANTICS`.').symbols).toStrictEqual(['CLI_SEMANTICS']);
  });

  it('cites each symbol once, however often the design repeats it', () => {
    expect(citationsFrom('`verdictFor` and `verdictFor()`').symbols).toStrictEqual(['verdictFor']);
  });
});

describe('what a design backticks that names no symbol', () => {
  it('leaves a plain word alone, since prose backticks its vocabulary', () => {
    expect(
      citationsFrom('An item is `triaged` before it is `implementing`.').symbols,
    ).toStrictEqual([]);
  });

  it('leaves a capitalized word alone, since a sentence capitalizes too', () => {
    expect(citationsFrom('Structure a test `Given`, `When`, `Then`.').symbols).toStrictEqual([]);
  });

  it('leaves something that is no identifier alone', () => {
    const cited = citationsFrom('The matcher is `Write|Edit` and the flag is `--fix`.');

    expect(cited.symbols).toStrictEqual([]);
  });

  it('leaves a path alone, since a path is cited as a path', () => {
    expect(citationsFrom('It changes `src/shared/writeGate.ts`.').symbols).toStrictEqual([]);
  });
});

describe('a design artifact that shows an example', () => {
  it('cites nothing inside a fenced block, since a fence holds an example', () => {
    const markdown = ['Before.', '', '```sh', 'cat made/up/path.ts', '```', '', 'After.'].join(
      '\n',
    );

    expect(citationsFrom(markdown)).toStrictEqual({ paths: [], symbols: [] });
  });

  it('cites what surrounds the fence', () => {
    const markdown = ['It reads `a/b.ts`.', '```', '`c/d.ts`', '```', 'It writes `e/f.ts`.'].join(
      '\n',
    );

    expect(citationsFrom(markdown).paths).toStrictEqual(['a/b.ts', 'e/f.ts']);
  });

  it('cites nothing past an unclosed fence, since the rest is all example', () => {
    expect(citationsFrom(['```', '`a/b.ts`'].join('\n')).paths).toStrictEqual([]);
  });

  it('reads a fence that declares a language', () => {
    const markdown = ['```typescript', '`a/b.ts`', '```', '`c/d.ts`'].join('\n');

    expect(citationsFrom(markdown).paths).toStrictEqual(['c/d.ts']);
  });
});

describe('the paths a design cites and the repository cannot show', () => {
  it('names a path the repository could not show', () => {
    const missing = missingFrom({ read: [{ path: 'src/gone.ts', missing: true }], symbols: [] });

    expect(missing).toStrictEqual({ paths: ['src/gone.ts'], symbols: [] });
  });

  it('says nothing about a path it read', () => {
    const missing = missingFrom({
      read: [{ path: 'src/here.ts', contents: 'export const here = 1;' }],
      symbols: [],
    });

    expect(missing).toStrictEqual({ paths: [], symbols: [] });
  });

  it('names every missing path, not only the first', () => {
    const missing = missingFrom({
      read: [
        { path: 'a.ts', missing: true },
        { path: 'b.ts', contents: '' },
        { path: 'c.ts', missing: true },
      ],
      symbols: [],
    });

    expect(missing.paths).toStrictEqual(['a.ts', 'c.ts']);
  });

  it('says nothing about an artifact that cites nothing', () => {
    expect(missingFrom({ read: [], symbols: [] })).toStrictEqual({ paths: [], symbols: [] });
  });
});

describe('the symbols a design cites and the files it names do not hold', () => {
  it('names a symbol none of the cited files holds', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'export function verdictFor() {}' }],
      symbols: ['resolvePreset'],
    });

    expect(missing).toStrictEqual({ paths: [], symbols: ['resolvePreset'] });
  });

  it('says nothing about a symbol one cited file holds', () => {
    const missing = missingFrom({
      read: [
        { path: 'src/other.ts', contents: 'export const other = 1;' },
        { path: 'src/gate.ts', contents: 'export function verdictFor() {}' },
      ],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual([]);
  });

  it('never reads a symbol out of a path it could not read', () => {
    const missing = missingFrom({
      read: [{ path: 'src/verdictFor.ts', missing: true }],
      symbols: ['verdictFor'],
    });

    expect(missing).toStrictEqual({ paths: ['src/verdictFor.ts'], symbols: ['verdictFor'] });
  });

  it('names every symbol a design cannot show, when it names no file at all', () => {
    const missing = missingFrom({ read: [], symbols: ['verdictFor', 'probeReply'] });

    expect(missing.symbols).toStrictEqual(['verdictFor', 'probeReply']);
  });
});

describe('where a cited symbol starts and stops inside a file', () => {
  it('reads a whole name, so a longer one does not stand in for it', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'export function verdictForNow() {}' }],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual(['verdictFor']);
  });

  it('reads a name a prefix runs into, so a shorter one does not stand in for it', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'export const theVerdictFor = 1;' }],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual(['verdictFor']);
  });

  it('finds a name a punctuation mark bounds', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'import { verdictFor } from "./x.ts";' }],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual([]);
  });

  it('finds a name the file opens with', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'verdictFor();' }],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual([]);
  });

  it('finds a name the file ends with', () => {
    const missing = missingFrom({
      read: [{ path: 'src/gate.ts', contents: 'export { verdictFor' }],
      symbols: ['verdictFor'],
    });

    expect(missing.symbols).toStrictEqual([]);
  });
});
