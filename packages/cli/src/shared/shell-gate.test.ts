import { describe, expect, it } from 'vitest';

import { shellVerdict } from './shell-gate.ts';

describe('a command that would step around a gate', () => {
  it('refuses the flag that skips the commit hooks', () => {
    expect(shellVerdict('git commit -m "wip" --no-verify')).toStrictEqual({
      refused: '--no-verify skips a gate. Fix what the gate found rather than stepping around it.',
    });
  });

  it('refuses the flag that skips signing', () => {
    expect(shellVerdict('git commit --no-gpg-sign -m "wip"')).toStrictEqual({
      refused:
        '--no-gpg-sign skips a gate. Fix what the gate found rather than stepping around it.',
    });
  });

  it('names the flag it found, since a refusal that names nothing teaches nothing', () => {
    const verdict = shellVerdict('git push --no-verify');

    expect('refused' in verdict && verdict.refused.startsWith('--no-verify')).toBe(true);
  });

  it('refuses it wherever it sits in the command', () => {
    for (const command of [
      '--no-verify',
      'git --no-verify commit',
      'git commit && git push --no-verify',
    ]) {
      expect({ command, verdict: shellVerdict(command) }).toStrictEqual({
        command,
        verdict: {
          refused:
            '--no-verify skips a gate. Fix what the gate found rather than stepping around it.',
        },
      });
    }
  });
});

describe('a command that skips nothing', () => {
  it('allows an ordinary commit', () => {
    expect(shellVerdict('git commit -m "add the write gate"')).toStrictEqual({ allowed: true });
  });

  it('allows the gates themselves', () => {
    for (const command of ['bun run test', 'bun run lint', 'git push']) {
      expect({ command, verdict: shellVerdict(command) }).toStrictEqual({
        command,
        verdict: { allowed: true },
      });
    }
  });

  it('allows a command that verifies rather than skips', () => {
    expect(shellVerdict('git verify-commit HEAD')).toStrictEqual({ allowed: true });
  });

  it('allows an empty command, since there is nothing to skip', () => {
    expect(shellVerdict('')).toStrictEqual({ allowed: true });
  });
});
