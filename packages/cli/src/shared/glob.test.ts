import { describe, expect, it } from 'vitest';

import { matchesGlob } from './glob.ts';

describe('matching a path against a pattern the preset declares', () => {
  it('matches a literal path', () => {
    expect(matchesGlob('src/main.ts', 'src/main.ts')).toBe(true);
  });

  it('refuses a path the pattern does not name', () => {
    expect(matchesGlob('src/main.ts', 'src/run.ts')).toBe(false);
  });

  it('lets a single star stand for one segment', () => {
    expect(matchesGlob('src/commands/*/command.ts', 'src/commands/create/command.ts')).toBe(true);
  });

  it('keeps a single star inside its segment', () => {
    expect(matchesGlob('src/commands/*/command.ts', 'src/commands/create/deep/command.ts')).toBe(
      false,
    );
  });

  it('lets a double star cross segments', () => {
    expect(matchesGlob('src/commands/*/io/**', 'src/commands/create/io/deep/write.ts')).toBe(true);
  });

  it('lets a double star match a single segment too', () => {
    expect(matchesGlob('src/commands/*/io/**', 'src/commands/create/io/write.ts')).toBe(true);
  });

  it('anchors at the start, so a suffix match is not a match', () => {
    expect(matchesGlob('src/main.ts', 'packages/cli/src/main.ts')).toBe(false);
  });

  it('anchors at the end, so a prefix match is not a match', () => {
    expect(matchesGlob('src/main.ts', 'src/main.ts.bak')).toBe(false);
  });

  it('reads a dot as a dot, not as any character', () => {
    expect(matchesGlob('src/main.ts', 'src/mainXts')).toBe(false);
  });

  it('matches a bare double star against anything under it', () => {
    expect(matchesGlob('src/**', 'src/a/b/c.ts')).toBe(true);
  });

  it('does not let a double star escape its prefix', () => {
    expect(matchesGlob('src/**', 'lib/a.ts')).toBe(false);
  });
});

describe('a star inside a segment', () => {
  it('matches a suffix', () => {
    expect(matchesGlob('src/*.ts', 'src/main.ts')).toBe(true);
  });

  it('refuses a different suffix', () => {
    expect(matchesGlob('src/*.ts', 'src/main.tsx')).toBe(false);
  });

  it('matches a prefix', () => {
    expect(matchesGlob('src/main.*', 'src/main.ts')).toBe(true);
  });

  it('needs room for both sides, so an overlap is not a match', () => {
    expect(matchesGlob('src/aa*aa.ts', 'src/aaa.ts')).toBe(false);
  });

  it('lets a double star stand for no segment at all', () => {
    expect(matchesGlob('src/**', 'src')).toBe(true);
  });

  it('refuses a path shorter than the pattern', () => {
    expect(matchesGlob('src/commands/*/command.ts', 'src/commands')).toBe(false);
  });
});

describe('the edges the walk has to get right', () => {
  it('refuses when the pattern runs out before the path does', () => {
    expect(matchesGlob('src', 'src/main.ts')).toBe(false);
  });

  it('refuses when a double star has more pattern behind it than path left', () => {
    expect(matchesGlob('src/**/command.ts', 'src')).toBe(false);
  });

  it('matches a double star in the middle when the path reaches past it', () => {
    expect(matchesGlob('src/**/command.ts', 'src/a/b/command.ts')).toBe(true);
  });

  it('matches a segment that is exactly as long as the two sides demand', () => {
    expect(matchesGlob('src/a*b.ts', 'src/ab.ts')).toBe(true);
  });
});
