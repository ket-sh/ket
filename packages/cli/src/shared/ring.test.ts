import type { RingCheck } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import { argvFor, argvOf } from './ring.ts';

const PER_FILE: RingCheck = { runs: 'oxlint --no-error-on-unmatched-pattern', scope: 'file' };

const PROJECT: RingCheck = { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' };

const COVERING: RingCheck = { runs: 'vitest run', scope: 'covering' };

const SHIMMED = new Set(['oxlint', 'tsc', 'vitest', 'stryker', 'knip']);

describe('turning a declared command into something runnable', () => {
  it('reaches a shimmed binary through the project, so a global install cannot shadow it', () => {
    expect(argvOf('stryker run', SHIMMED)[0]).toBe('./node_modules/.bin/stryker');
  });

  it('keeps the arguments the command declared, in the order it wrote them', () => {
    expect(argvOf('tsc --noEmit -p tsconfig.json', SHIMMED)).toStrictEqual([
      './node_modules/.bin/tsc',
      '--noEmit',
      '-p',
      'tsconfig.json',
    ]);
  });

  it('reaches a bare shimmed command through the project too', () => {
    expect(argvOf('knip', SHIMMED)).toStrictEqual(['./node_modules/.bin/knip']);
  });

  it('leaves a runtime the project holds no shim for alone, so the PATH answers for it', () => {
    expect(argvOf('bun scripts/mutate-changed.mts', SHIMMED)).toStrictEqual([
      'bun',
      'scripts/mutate-changed.mts',
    ]);
  });

  it('shims only the command, never an argument that shares a shim name', () => {
    expect(argvOf('vitest related vitest', SHIMMED)).toStrictEqual([
      './node_modules/.bin/vitest',
      'related',
      'vitest',
    ]);
  });
});

describe('turning a declared check into something runnable', () => {
  it('reaches the binary through the project, so a global install cannot shadow it', () => {
    expect(argvFor(PER_FILE, [], 'src/auth.ts', SHIMMED)?.[0]).toBe('./node_modules/.bin/oxlint');
  });

  it('keeps the arguments the check declared', () => {
    expect(argvFor(PROJECT, [], 'src/auth.ts', SHIMMED)).toStrictEqual([
      './node_modules/.bin/tsc',
      '--noEmit',
      '-p',
      'tsconfig.json',
    ]);
  });

  it('appends the written file to a check scoped to one', () => {
    expect(argvFor(PER_FILE, [], 'src/auth.ts', SHIMMED)).toStrictEqual([
      './node_modules/.bin/oxlint',
      '--no-error-on-unmatched-pattern',
      './src/auth.ts',
    ]);
  });

  it('appends nothing to a check scoped to the project', () => {
    expect(argvFor(PROJECT, [], 'src/auth.ts', SHIMMED)).not.toContain('src/auth.ts');
  });

  it('runs a check the project holds no shim for from the PATH, the way the command form does', () => {
    const check: RingCheck = { runs: 'bun scripts/mutate-changed.mts', scope: 'project' };

    expect(argvFor(check, [], 'src/auth.ts', SHIMMED)).toStrictEqual([
      'bun',
      'scripts/mutate-changed.mts',
    ]);
  });
});

describe('a check scoped to what covers the written file', () => {
  it('runs over every test that covers it', () => {
    expect(
      argvFor(
        COVERING,
        ['/repo/src/auth.test.ts', '/repo/src/auth.property.test.ts'],
        'src/auth.ts',
        SHIMMED,
      ),
    ).toStrictEqual([
      './node_modules/.bin/vitest',
      'run',
      '/repo/src/auth.test.ts',
      '/repo/src/auth.property.test.ts',
    ]);
  });

  it('does not run at all when nothing covers it, since the whole suite answers nothing', () => {
    expect(argvFor(COVERING, [], 'src/auth.ts', SHIMMED)).toBeUndefined();
  });

  it('leaves the written file out, since the tests are what run', () => {
    expect(argvFor(COVERING, ['/repo/src/auth.test.ts'], 'src/auth.ts', SHIMMED)).not.toContain(
      './src/auth.ts',
    );
  });

  it('runs a check scoped to the file whatever covers it', () => {
    expect(argvFor(PER_FILE, [], 'src/auth.ts', SHIMMED)).toStrictEqual([
      './node_modules/.bin/oxlint',
      '--no-error-on-unmatched-pattern',
      './src/auth.ts',
    ]);
  });
});

describe('a written path that reads like a flag', () => {
  it('anchors an ordinary path, since a path is what it has to stay', () => {
    expect(argvFor(PER_FILE, [], 'src/auth.ts', SHIMMED)).toContain('./src/auth.ts');
  });

  it('refuses to let a leading dash become an argument', () => {
    expect(argvFor(PER_FILE, [], '--fix', SHIMMED)).toStrictEqual([
      './node_modules/.bin/oxlint',
      '--no-error-on-unmatched-pattern',
      './--fix',
    ]);
  });

  it('does the same for a single dash, since that means stdin to many tools', () => {
    expect(argvFor(PER_FILE, [], '-', SHIMMED)).toContain('./-');
  });

  it('leaves a path already anchored to the working directory alone', () => {
    expect(argvFor(PER_FILE, [], './src/auth.ts', SHIMMED)).toContain('./src/auth.ts');
  });

  it('leaves an absolute path alone, since it cannot be read as a flag', () => {
    expect(argvFor(PER_FILE, [], '/tmp/auth.ts', SHIMMED)).toContain('/tmp/auth.ts');
  });

  it('anchors a path that climbs, since it is still a path', () => {
    expect(argvFor(PER_FILE, [], '../outside/auth.ts', SHIMMED)).toContain('./../outside/auth.ts');
  });
});
