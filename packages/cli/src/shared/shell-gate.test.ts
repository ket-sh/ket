import { describe, expect, it } from 'vitest';

import type { CommandAttempt } from './shell-gate.ts';
import type { GovernedItem } from './write-gate.ts';

import { shellVerdict, unreadableVerdict } from './shell-gate.ts';

const TRIAGED: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'story',
  status: 'triaged',
  children: [],
};

function attempt(over: Partial<CommandAttempt>): CommandAttempt {
  return {
    command: 'bun run test',
    written: [],
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    lockfile: 'bun.lock',
    inFlight: [TRIAGED],
    ...over,
  };
}

describe('a command that would step around a gate', () => {
  it('refuses the flag that skips the commit hooks', () => {
    expect(shellVerdict(attempt({ command: 'git commit -m wip --no-verify' }))).toStrictEqual({
      refused: '--no-verify skips a gate. Fix what the gate found rather than stepping around it.',
    });
  });

  it('refuses the flag that skips signing', () => {
    expect(shellVerdict(attempt({ command: 'git commit --no-gpg-sign -m wip' }))).toStrictEqual({
      refused:
        '--no-gpg-sign skips a gate. Fix what the gate found rather than stepping around it.',
    });
  });

  it('refuses it wherever it sits in the command', () => {
    for (const command of ['--no-verify', 'git commit && git push --no-verify']) {
      expect({ command, verdict: shellVerdict(attempt({ command })) }).toStrictEqual({
        command,
        verdict: {
          refused:
            '--no-verify skips a gate. Fix what the gate found rather than stepping around it.',
        },
      });
    }
  });
});

describe('a command that skips nothing and writes nothing', () => {
  it('runs, since reading is what most of a session is', () => {
    for (const command of ['git commit -m "add the write gate"', 'bun run lint', 'git push']) {
      expect({ command, verdict: shellVerdict(attempt({ command })) }).toStrictEqual({
        command,
        verdict: { allowed: true },
      });
    }
  });

  it('runs a command that verifies rather than skips', () => {
    expect(shellVerdict(attempt({ command: 'git verify-commit HEAD' }))).toStrictEqual({
      allowed: true,
    });
  });
});

describe('a command that writes what a write would be refused', () => {
  it('refuses the write the shell would have made, and names the file', () => {
    const verdict = shellVerdict(
      attempt({ command: 'printf x > src/auth.ts', written: ['src/auth.ts'] }),
    );

    expect(verdict).toStrictEqual({
      refused:
        'this command writes src/auth.ts. AUTH-1 is triaged, not implementing. Approval comes before source.',
    });
  });

  it('refuses a lockfile a shell rewrites, since the rule is the same rule', () => {
    expect(
      shellVerdict(attempt({ command: 'printf x > bun.lock', written: ['bun.lock'] })),
    ).toStrictEqual({
      refused:
        'this command writes bun.lock. bun.lock is a lockfile. Install the dependency rather than editing the record of one.',
    });
  });

  it('refuses on the first file a rule stops, whatever else the command writes', () => {
    const verdict = shellVerdict(
      attempt({ command: 'x', written: ['README.md', 'src/auth.ts', 'src/other.ts'] }),
    );

    expect(verdict).toStrictEqual({
      refused:
        'this command writes src/auth.ts. AUTH-1 is triaged, not implementing. Approval comes before source.',
    });
  });

  it('runs when every file it writes is one the rules allow', () => {
    expect(
      shellVerdict(attempt({ command: 'x', written: ['README.md', 'docs/plan.md'] })),
    ).toStrictEqual({ allowed: true });
  });

  it('runs a source write the item has earned', () => {
    expect(
      shellVerdict(
        attempt({
          command: 'x',
          written: ['src/auth.ts'],
          inFlight: [{ ...TRIAGED, status: 'implementing' }],
        }),
      ),
    ).toStrictEqual({ allowed: true });
  });
});

describe('a command ket could not read', () => {
  it('refuses and names the part it could not read', () => {
    expect(unreadableVerdict('python -c')).toStrictEqual({
      refused:
        'ket cannot read what this command writes, because of python -c. Write the file with the Write tool so a gate can judge it.',
    });
  });
});
