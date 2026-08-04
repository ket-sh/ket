import { describe, expect, it } from 'vitest';

import { proposalEventFrom, proposalReply } from './proposal.ts';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand. Use the ' +
  'ket:mechanical-checks skill: research the check that would keep it, judge whether it earns ' +
  'its cost, and propose it. ket proposes, the user decides.';

describe('proposing a machine for a rule a dependency brought', () => {
  it('says nothing when nothing arrived, so a session about nothing stays quiet', () => {
    expect(proposalReply([], 'SessionStart')).toBeUndefined();
  });

  it('names the arrival and sends the session to the skill that judges it', () => {
    expect(proposalReply(['drizzle-orm'], 'SessionStart')).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `new since ket last looked: drizzle-orm\n\n${ASKING}`,
      },
    });
  });

  it('names every arrival, not only the first', () => {
    expect(
      proposalReply(['drizzle-orm', 'redis'], 'SessionStart')?.hookSpecificOutput.additionalContext,
    ).toContain('new since ket last looked: drizzle-orm, redis');
  });

  it('never carries a decision, since a look refuses nothing', () => {
    expect(Object.keys(proposalReply(['redis'], 'SessionStart') ?? {})).toStrictEqual([
      'hookSpecificOutput',
    ]);
  });

  it('answers a mid-session look in the shape of the event that asked', () => {
    expect(proposalReply(['redis'], 'PostToolUse')).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `new since ket last looked: redis\n\n${ASKING}`,
      },
    });
  });
});

describe('reading which event asked for the look', () => {
  it('takes the mid-session event the envelope names', () => {
    expect(proposalEventFrom({ hook_event_name: 'PostToolUse' })).toBe('PostToolUse');
  });

  it('takes the session start the envelope names', () => {
    expect(proposalEventFrom({ hook_event_name: 'SessionStart' })).toBe('SessionStart');
  });

  it('falls back to session start when no envelope arrived', () => {
    expect(proposalEventFrom(undefined)).toBe('SessionStart');
  });

  it('falls back to session start for an event the reply has no shape for', () => {
    expect(proposalEventFrom({ hook_event_name: 'Stop' })).toBe('SessionStart');
  });
});
