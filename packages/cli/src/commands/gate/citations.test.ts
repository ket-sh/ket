import { describe, expect, it } from 'vitest';

import { citationReply, pathsCitedIn, missingIn } from './citations.ts';

describe('what a design cites', () => {
  it('names every path the design opened a backtick for', () => {
    expect(pathsCitedIn('it lives in `src/a.ts` beside `src/b.ts`')).toStrictEqual([
      'src/a.ts',
      'src/b.ts',
    ]);
  });

  it('names nothing for prose that cites nothing', () => {
    expect(pathsCitedIn('the counter goes up')).toStrictEqual([]);
  });
});

describe('what the repository could not answer for', () => {
  it('says a cited file is one the repository has not got', () => {
    expect(missingIn('see `src/a.ts`', [{ path: 'src/a.ts', missing: true }])).toStrictEqual([
      'src/a.ts is cited and the repository has no such file',
    ]);
  });

  it('says a cited symbol is in none of the files the design named', () => {
    expect(
      missingIn('`lockedOut()` lives in `src/a.ts`', [
        { path: 'src/a.ts', contents: 'export {};' },
      ]),
    ).toStrictEqual(['lockedOut is cited and none of the cited files defines it']);
  });

  it('says nothing when every citation held', () => {
    expect(
      missingIn('`lockedOut()` lives in `src/a.ts`', [
        { path: 'src/a.ts', contents: 'export function lockedOut() {}' },
      ]),
    ).toStrictEqual([]);
  });

  it('reports a missing file before a missing symbol, since the file explains the symbol', () => {
    expect(
      missingIn('`lockedOut()` lives in `src/a.ts`', [{ path: 'src/a.ts', missing: true }]),
    ).toStrictEqual([
      'src/a.ts is cited and the repository has no such file',
      'lockedOut is cited and none of the cited files defines it',
    ]);
  });
});

describe('the answer a post-tool-use hook carries', () => {
  it('stays quiet when the design cited nothing it could not find', () => {
    expect(citationReply([])).toBeUndefined();
  });

  it('names the heading and every finding under it', () => {
    expect(citationReply(['src/a.ts is cited and the repository has no such file'])).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          'this design cites something the repository does not have.\n\nsrc/a.ts is cited and the repository has no such file',
      },
    });
  });

  it('puts every finding on its own line', () => {
    expect(citationReply(['first thing missing', 'second thing missing'])).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          'this design cites something the repository does not have.\n\nfirst thing missing\nsecond thing missing',
      },
    });
  });

  it('never carries a decision, since a post-tool-use hook must not block', () => {
    expect(
      JSON.stringify(citationReply(['x is cited and the repository has no such file'])),
    ).not.toContain('permissionDecision');
  });
});
