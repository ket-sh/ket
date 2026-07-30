import { describe, expect, it } from 'vitest';

import type { GovernedItem, WriteAttempt } from './write-gate.ts';

import { verdictFor } from './write-gate.ts';

const STORY: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
};

function attempt(over: Partial<WriteAttempt>): WriteAttempt {
  return {
    path: 'src/auth.ts',
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    inFlight: [STORY],
    ...over,
  };
}

describe('a write nothing governs', () => {
  it('allows a path outside every source root', () => {
    expect(verdictFor(attempt({ path: 'README.md' }))).toStrictEqual({ allowed: true });
  });

  it('allows a write when no item is in flight', () => {
    expect(verdictFor(attempt({ inFlight: [] }))).toStrictEqual({ allowed: true });
  });

  it('allows a source write once the item is implementing', () => {
    expect(verdictFor(attempt({}))).toStrictEqual({ allowed: true });
  });
});

describe('a write the approve gate has not reached', () => {
  it('refuses while the item is only triaged', () => {
    const verdict = verdictFor(attempt({ inFlight: [{ ...STORY, status: 'triaged' }] }));

    expect(verdict).toStrictEqual({
      refused: 'AUTH-1 is triaged, not implementing. Approval comes before source.',
    });
  });

  it('refuses at every status short of implementing', () => {
    for (const status of ['triaged', 'designing', 'awaiting-approval', 'verifying'] as const) {
      const verdict = verdictFor(attempt({ inFlight: [{ ...STORY, status }] }));

      expect({ status, verdict }).toStrictEqual({
        status,
        verdict: {
          refused: `AUTH-1 is ${status}, not implementing. Approval comes before source.`,
        },
      });
    }
  });
});

describe('a classification the change contradicts', () => {
  it('refuses a trivial item writing to an adapter, since that owes a test layer', () => {
    const verdict = verdictFor(
      attempt({
        path: 'src/commands/create/command.ts',
        inFlight: [{ ...STORY, size: 'trivial' }],
      }),
    );

    expect(verdict).toStrictEqual({
      refused:
        'AUTH-1 is trivial, and src/commands/create/command.ts is an adapter. It was never trivial, so triage runs again.',
    });
  });

  it('allows a trivial item writing away from every adapter', () => {
    expect(
      verdictFor(attempt({ path: 'src/greeting.ts', inFlight: [{ ...STORY, size: 'trivial' }] })),
    ).toStrictEqual({ allowed: true });
  });

  it('allows a story writing to an adapter, since only trivial owes the layer', () => {
    expect(verdictFor(attempt({ path: 'src/commands/create/command.ts' }))).toStrictEqual({
      allowed: true,
    });
  });

  it('refuses a refactor touching a scenario, since a changed scenario is a feature', () => {
    const verdict = verdictFor(
      attempt({
        path: 'src/features/login.feature',
        inFlight: [{ ...STORY, kind: 'refactor' }],
      }),
    );

    expect(verdict).toStrictEqual({
      refused:
        'AUTH-1 is a refactor, and src/features/login.feature is a scenario. A changed scenario makes it a feature.',
    });
  });

  it('allows a refactor writing anywhere else', () => {
    expect(verdictFor(attempt({ inFlight: [{ ...STORY, kind: 'refactor' }] }))).toStrictEqual({
      allowed: true,
    });
  });

  it('allows a feature touching a scenario, since only a refactor may not', () => {
    expect(verdictFor(attempt({ path: 'src/features/login.feature' }))).toStrictEqual({
      allowed: true,
    });
  });
});

describe('more work in flight than one branch should hold', () => {
  it('refuses and names every item, since one job means one branch', () => {
    const verdict = verdictFor(attempt({ inFlight: [STORY, { ...STORY, key: 'AUTH-2' }] }));

    expect(verdict).toStrictEqual({
      refused: 'AUTH-1 and AUTH-2 are both in flight. One job means one branch.',
    });
  });

  it('refuses before it reads a status, since neither item is the one', () => {
    const verdict = verdictFor(
      attempt({
        inFlight: [
          { ...STORY, status: 'triaged' },
          { ...STORY, key: 'AUTH-2', status: 'triaged' },
        ],
      }),
    );

    expect(verdict).toStrictEqual({
      refused: 'AUTH-1 and AUTH-2 are both in flight. One job means one branch.',
    });
  });
});

describe('deciding whether a path is under a source root', () => {
  it('governs the source root itself', () => {
    expect(
      verdictFor(attempt({ path: 'src', inFlight: [{ ...STORY, status: 'triaged' }] })),
    ).toStrictEqual({
      refused: 'AUTH-1 is triaged, not implementing. Approval comes before source.',
    });
  });

  it('reads a directory boundary, not a string prefix', () => {
    expect(
      verdictFor(attempt({ path: 'srcx/auth.ts', inFlight: [{ ...STORY, status: 'triaged' }] })),
    ).toStrictEqual({ allowed: true });
  });

  it('governs a path under any one of several roots', () => {
    expect(
      verdictFor(
        attempt({
          path: 'features/login.ts',
          sources: ['src', 'features'],
          inFlight: [{ ...STORY, status: 'triaged' }],
        }),
      ),
    ).toStrictEqual({
      refused: 'AUTH-1 is triaged, not implementing. Approval comes before source.',
    });
  });

  it('governs nothing when the target declares no source root', () => {
    expect(
      verdictFor(attempt({ sources: [], inFlight: [{ ...STORY, status: 'triaged' }] })),
    ).toStrictEqual({ allowed: true });
  });
});

describe('a target that calls more than one path an adapter', () => {
  it('refuses a trivial item matching any one of them', () => {
    const verdict = verdictFor(
      attempt({
        path: 'src/commands/create/io/write.ts',
        adapters: ['src/commands/*/command.ts', 'src/commands/*/io/**'],
        inFlight: [{ ...STORY, size: 'trivial' }],
      }),
    );

    expect(verdict).toStrictEqual({
      refused:
        'AUTH-1 is trivial, and src/commands/create/io/write.ts is an adapter. It was never trivial, so triage runs again.',
    });
  });

  it('allows a trivial item matching none of them', () => {
    expect(
      verdictFor(
        attempt({
          path: 'src/greeting.ts',
          adapters: ['src/commands/*/command.ts', 'src/commands/*/io/**'],
          inFlight: [{ ...STORY, size: 'trivial' }],
        }),
      ),
    ).toStrictEqual({ allowed: true });
  });
});

describe('a status written by hand rather than by a gate', () => {
  it('refuses an edit to an item file, since only a gate moves a status', () => {
    expect(
      verdictFor(attempt({ path: '.ket/items/AUTH-1/item.yaml', sources: ['src'] })),
    ).toStrictEqual({
      refused:
        '.ket/items/AUTH-1/item.yaml records a status, and only a gate writes one. Use /ket:approve.',
    });
  });

  it('refuses it even when nothing is in flight, since the file is still state', () => {
    expect(
      verdictFor(attempt({ path: '.ket/items/AUTH-1/item.yaml', inFlight: [] })),
    ).toStrictEqual({
      refused:
        '.ket/items/AUTH-1/item.yaml records a status, and only a gate writes one. Use /ket:approve.',
    });
  });

  it('refuses it before it reads the classification, since the file is the classification', () => {
    expect(
      verdictFor(
        attempt({
          path: '.ket/items/AUTH-1/item.yaml',
          inFlight: [{ ...STORY, size: 'trivial' }],
        }),
      ),
    ).toStrictEqual({
      refused:
        '.ket/items/AUTH-1/item.yaml records a status, and only a gate writes one. Use /ket:approve.',
    });
  });

  it('allows the notes beside an item, since prose is not a status', () => {
    expect(verdictFor(attempt({ path: '.ket/items/AUTH-1/spec.md' }))).toStrictEqual({
      allowed: true,
    });
  });

  it('allows the board, since it is generated from the items', () => {
    expect(verdictFor(attempt({ path: '.ket/BOARD.md' }))).toStrictEqual({ allowed: true });
  });

  it('allows a file merely named like an item file elsewhere', () => {
    expect(verdictFor(attempt({ path: 'docs/item.yaml' }))).toStrictEqual({ allowed: true });
  });
});
