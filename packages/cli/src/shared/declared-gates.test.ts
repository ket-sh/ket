import type { GateSemantics } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import { declaredGateEventFor, declaredGatesRunBy } from './declared-gates.ts';

function gateOf(script: string): GateSemantics {
  return { script, guards: `It guards ${script}.`, commitJob: script, ciJob: 'check' };
}

const DECLARED = ['lint', 'lint:dup', 'check-types', 'test'].map((script) => gateOf(script));

function runsOf(command: string): string[] {
  return declaredGatesRunBy(command, DECLARED);
}

describe('a command that runs a declared gate script', () => {
  it('names the gate under the name the preset declared', () => {
    expect(runsOf('bun run lint:dup')).toStrictEqual(['lint:dup']);
  });

  it('names every declared gate a chained command runs, in the order it runs them', () => {
    expect(runsOf('bun run lint && bun run check-types')).toStrictEqual(['lint', 'check-types']);
  });

  it('reads past a runner flag to the script it runs', () => {
    expect(runsOf('bun run --silent lint')).toStrictEqual(['lint']);
  });

  it('finds a run that follows a directory move', () => {
    expect(runsOf('cd packages/cli && bun run lint')).toStrictEqual(['lint']);
  });

  it('names one run where a command repeats the same script', () => {
    expect(runsOf('bun run lint && bun run lint')).toStrictEqual(['lint']);
  });

  it('reads the script name, not the arguments behind it', () => {
    expect(runsOf('bun run test src/shared')).toStrictEqual(['test']);
  });

  it('reads the script name past a redirect that follows it', () => {
    expect(runsOf('bun run test > /dev/null 2>&1')).toStrictEqual(['test']);
  });
});

describe('a command that runs no declared gate script', () => {
  it('reads a script the preset declares no gate for as no gate at all', () => {
    expect(runsOf('bun run prepare')).toStrictEqual([]);
  });

  it('reads a command with no script runner as no gate at all', () => {
    for (const command of ['git status', 'oxlint --deny-warnings .', 'bun test', 'ls -la src']) {
      expect({ command, runs: runsOf(command) }).toStrictEqual({ command, runs: [] });
    }
  });

  it('reads a declared name quoted as data rather than as a run', () => {
    expect(runsOf('git commit -m "bun run lint"')).toStrictEqual([]);
  });

  it('reads a declared name among arguments as data rather than as a run', () => {
    expect(runsOf('grep -rn lint src')).toStrictEqual([]);
  });

  it('reads a runner other than bun as no script run', () => {
    expect(runsOf('npm run lint')).toStrictEqual([]);
  });

  it('reads a bun subcommand that is not run as no script run', () => {
    expect(runsOf('bun test lint')).toStrictEqual([]);
  });
});

describe('the event a declared gate run leaves in the log', () => {
  it('carries the declared name and the command, so the retro can find the gate again', () => {
    expect(declaredGateEventFor('lint:dup', 'bun run lint:dup')).toStrictEqual({
      gate: 'lint:dup',
      outcome: 'allowed',
      about: 'bun run lint:dup',
    });
  });
});
