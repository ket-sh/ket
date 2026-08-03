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

describe('a filed backlog beside the item being worked', () => {
  it('waits rather than crowds, so the item worked writes', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, key: 'AUTH-2', status: 'triaged' },
          STORY,
          { ...STORY, key: 'AUTH-3', status: 'triaged' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({ allowed: true });
  });

  it('leaves the item being worked in charge even when a filed sibling sorts first', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, key: 'AUTH-2' },
          { ...STORY, key: 'AUTH-1', status: 'triaged' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({ allowed: true });
  });

  it('goes unnamed when two items being worked crowd the branch', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, key: 'AUTH-4', status: 'triaged' },
          STORY,
          { ...STORY, key: 'AUTH-2', status: 'designing' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({
      refused: 'AUTH-1 and AUTH-2 are both in flight. One job means one branch.',
    });
  });
});

describe('a board holding only filed items', () => {
  it('is held at the approval gate under its first key, since nothing crowds', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, key: 'AUTH-3', status: 'triaged' },
          { ...STORY, key: 'AUTH-2', status: 'triaged' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({
      refused: 'AUTH-2 is triaged, not implementing. Approval comes before source.',
    });
  });
});

describe('naming three or more jobs in flight at once', () => {
  it('says all rather than both, since both means two', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, key: 'OS-3' },
          { ...STORY, key: 'OS-1' },
          { ...STORY, key: 'OS-2' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({
      refused: 'OS-1 and OS-2 and OS-3 are all in flight. One job means one branch.',
    });
  });
});

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
