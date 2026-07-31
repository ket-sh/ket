import { describe, expect, it } from 'vitest';

import type { GovernedItem, WriteAttempt } from './write-gate.ts';

import { verdictFor } from './write-gate.ts';

const STORY: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  children: [],
};

function attempt(over: Partial<WriteAttempt>): WriteAttempt {
  return {
    path: 'src/auth.ts',
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    lockfile: 'bun.lock',
    inFlight: [STORY],
    ...over,
  };
}

describe('naming the two jobs that are both in flight', () => {
  it('names them in key order, whatever order the directory returned them in', () => {
    const scattered = verdictFor(
      attempt({
        path: 'src/auth.ts',
        inFlight: [
          { ...STORY, key: 'OS-3' },
          { ...STORY, key: 'OS-2' },
        ],
      }),
    );

    expect(scattered).toStrictEqual({
      refused: 'OS-2 and OS-3 are both in flight. One job means one branch.',
    });
  });

  it('reads the same whichever order they arrive in, so the message never shifts', () => {
    const forwards = verdictFor(
      attempt({
        path: 'src/auth.ts',
        inFlight: [
          { ...STORY, key: 'OS-2' },
          { ...STORY, key: 'OS-3' },
        ],
      }),
    );
    const backwards = verdictFor(
      attempt({
        path: 'src/auth.ts',
        inFlight: [
          { ...STORY, key: 'OS-3' },
          { ...STORY, key: 'OS-2' },
        ],
      }),
    );

    expect(forwards).toStrictEqual(backwards);
  });
});
