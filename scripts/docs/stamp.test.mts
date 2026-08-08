import { describe, expect, it } from 'vitest';

import { sourcesOf, stampOf } from './stamp.mts';

const files = [
  'packages/cli/src/main.ts',
  'packages/cli/src/commands/create/command.ts',
  'packages/preset/src/index.ts',
  'harness/gates/law.md',
  'README.md',
];

describe('source globs', () => {
  it('given a double star glob, then it reaches every nested file', () => {
    expect(sourcesOf(files, ['packages/cli/src/**'])).toEqual([
      'packages/cli/src/commands/create/command.ts',
      'packages/cli/src/main.ts',
    ]);
  });

  it('given a single star, then it stops at the slash', () => {
    expect(sourcesOf(files, ['packages/cli/src/*'])).toEqual(['packages/cli/src/main.ts']);
  });

  it('given an exact path, then only that file matches', () => {
    expect(sourcesOf(files, ['README.md'])).toEqual(['README.md']);
  });

  it('given several globs, then the union comes back sorted and deduplicated', () => {
    const matched = sourcesOf(files, ['harness/**', 'packages/preset/src/**', 'harness/**']);

    expect(matched).toEqual(['harness/gates/law.md', 'packages/preset/src/index.ts']);
  });
});

describe('the stamp fingerprint', () => {
  const entries = [
    { path: 'a.ts', content: 'export const a = 1;' },
    { path: 'b.ts', content: 'export const b = 2;' },
  ];

  it('given the same sources, then the stamp is twelve hex characters and stable', () => {
    const stamp = stampOf(entries);

    expect(stamp).toMatch(/^[0-9a-f]{12}$/u);
    expect(stampOf(entries)).toBe(stamp);
  });

  it('given the sources in any order, then the stamp does not move', () => {
    expect(stampOf([...entries].reverse())).toBe(stampOf(entries));
  });

  it('given changed content, then the stamp moves', () => {
    const changed = [entries[0], { path: 'b.ts', content: 'export const b = 3;' }].flatMap(
      (entry) => (entry === undefined ? [] : [entry]),
    );

    expect(stampOf(changed)).not.toBe(stampOf(entries));
  });

  it('given a renamed source, then the stamp moves', () => {
    const renamed = [
      { path: 'a.ts', content: 'export const a = 1;' },
      { path: 'moved.ts', content: 'export const b = 2;' },
    ];

    expect(stampOf(renamed)).not.toBe(stampOf(entries));
  });
});
