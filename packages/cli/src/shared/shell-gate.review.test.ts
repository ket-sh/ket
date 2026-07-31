import { describe, expect, it } from 'vitest';

import type { CommandAttempt } from './shell-gate.ts';
import type { GovernedItem } from './write-gate.ts';

import { shellVerdict } from './shell-gate.ts';

const WORKING: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'story',
  status: 'awaiting-merge',
  children: [],
};

function attempt(over: Partial<CommandAttempt>): CommandAttempt {
  return {
    command: 'git push',
    written: [],
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    lockfile: 'bun.lock',
    inFlight: [WORKING],
    reviewed: [],
    ...over,
  };
}

describe('putting work in front of somebody before it was reviewed', () => {
  it('refuses a push while no review has answered for the item', () => {
    expect(shellVerdict(attempt({}))).toStrictEqual({
      refused:
        'this command publishes AUTH-1 and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip AUTH-1 --reason.',
    });
  });

  it('refuses opening a pull request on the same terms', () => {
    expect(shellVerdict(attempt({ command: 'gh pr create --fill' }))).toStrictEqual({
      refused:
        'this command publishes AUTH-1 and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip AUTH-1 --reason.',
    });
  });

  it('allows the push once a review has answered for the item', () => {
    expect(shellVerdict(attempt({ reviewed: ['AUTH-1'] }))).toStrictEqual({ allowed: true });
  });

  it('allows a command that publishes nothing, reviewed or not', () => {
    expect(shellVerdict(attempt({ command: 'git status' }))).toStrictEqual({ allowed: true });
  });

  it('allows a push when nothing is in flight, since it answers for no item', () => {
    expect(shellVerdict(attempt({ inFlight: [] }))).toStrictEqual({ allowed: true });
  });

  it('allows a push before the item carries any source, since nothing is there to review', () => {
    expect(shellVerdict(attempt({ inFlight: [{ ...WORKING, status: 'triaged' }] }))).toStrictEqual({
      allowed: true,
    });
  });

  it('refuses a push while the item is verifying, since the source is already written', () => {
    expect(
      shellVerdict(attempt({ inFlight: [{ ...WORKING, status: 'verifying' }] })),
    ).toStrictEqual({
      refused:
        'this command publishes AUTH-1 and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip AUTH-1 --reason.',
    });
  });

  it('refuses a push while the item is still implementing, since source exists by then', () => {
    expect(
      shellVerdict(attempt({ inFlight: [{ ...WORKING, status: 'implementing' }] })),
    ).toStrictEqual({
      refused:
        'this command publishes AUTH-1 and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip AUTH-1 --reason.',
    });
  });

  it('reads a review of another item as answering for nothing here', () => {
    expect(shellVerdict(attempt({ reviewed: ['AUTH-2'] }))).toStrictEqual({
      refused:
        'this command publishes AUTH-1 and no review has answered for it. Run /ket:review, or record a deliberate skip with ket review skip AUTH-1 --reason.',
    });
  });
});
