import { describe, expect, it } from 'vitest';

import { probeReply } from './ring.ts';

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
