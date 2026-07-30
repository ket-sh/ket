import type { RingCheck } from '@ket/preset-cli';

import { describe, expect, it } from 'vitest';

import { argvFor, probeReply } from './ring.ts';

const PER_FILE: RingCheck = { runs: 'oxlint --no-error-on-unmatched-pattern', scope: 'file' };

const PROJECT: RingCheck = { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' };

describe('turning a declared check into something runnable', () => {
  it('reaches the binary through the project, so a global install cannot shadow it', () => {
    expect(argvFor(PER_FILE, 'src/auth.ts')[0]).toBe('./node_modules/.bin/oxlint');
  });

  it('keeps the arguments the check declared', () => {
    expect(argvFor(PROJECT, 'src/auth.ts')).toStrictEqual([
      './node_modules/.bin/tsc',
      '--noEmit',
      '-p',
      'tsconfig.json',
    ]);
  });

  it('appends the written file to a check scoped to one', () => {
    expect(argvFor(PER_FILE, 'src/auth.ts')).toStrictEqual([
      './node_modules/.bin/oxlint',
      '--no-error-on-unmatched-pattern',
      'src/auth.ts',
    ]);
  });

  it('appends nothing to a check scoped to the project', () => {
    expect(argvFor(PROJECT, 'src/auth.ts')).not.toContain('src/auth.ts');
  });
});

describe('reporting what a ring found', () => {
  it('says nothing when every check passed, so a clean write stays quiet', () => {
    expect(probeReply([])).toBeUndefined();
  });

  it('names the check that failed and what it said', () => {
    expect(probeReply([{ runs: 'oxlint', said: 'src/auth.ts:3:1 no-unused-vars' }])).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: 'ring 1 found something.\n\noxlint\nsrc/auth.ts:3:1 no-unused-vars',
      },
    });
  });

  it('reports every failure, not only the first', () => {
    const reply = probeReply([
      { runs: 'oxlint', said: 'a' },
      { runs: 'tsc', said: 'b' },
    ]);

    expect(reply?.hookSpecificOutput.additionalContext).toBe(
      'ring 1 found something.\n\noxlint\na\n\ntsc\nb',
    );
  });

  it('never carries a decision, since the write already happened', () => {
    expect(Object.keys(probeReply([{ runs: 'oxlint', said: 'a' }]) ?? {})).toStrictEqual([
      'hookSpecificOutput',
    ]);
  });
});
