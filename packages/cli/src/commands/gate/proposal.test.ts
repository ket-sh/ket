import { describe, expect, it } from 'vitest';

import { proposalReply } from './proposal.ts';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand. Use the ' +
  'ket:mechanical-checks skill: research the check that would keep it, judge whether it earns ' +
  'its cost, and propose it. ket proposes, the user decides.';

describe('proposing a machine for a rule a dependency brought', () => {
  it('says nothing when nothing arrived, so a session about nothing stays quiet', () => {
    expect(proposalReply([])).toBeUndefined();
  });

  it('names the arrival and sends the session to the skill that judges it', () => {
    expect(proposalReply(['drizzle-orm'])).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `new since ket last looked: drizzle-orm\n\n${ASKING}`,
      },
    });
  });

  it('names every arrival, not only the first', () => {
    expect(proposalReply(['drizzle-orm', 'redis'])?.hookSpecificOutput.additionalContext).toContain(
      'new since ket last looked: drizzle-orm, redis',
    );
  });

  it('never carries a decision, since a session start refuses nothing', () => {
    expect(Object.keys(proposalReply(['redis']) ?? {})).toStrictEqual(['hookSpecificOutput']);
  });
});
