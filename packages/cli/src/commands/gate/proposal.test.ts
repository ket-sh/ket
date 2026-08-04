import { describe, expect, it } from 'vitest';

import { proposalEventFrom, proposalReply } from './proposal.ts';

function only(dependencies: string[]): {
  dependencies: string[];
  decisions: string[];
  kinds: string[];
} {
  return { dependencies, decisions: [], kinds: [] };
}

function contextOf(
  arrivals: { dependencies: string[]; decisions: string[]; kinds: string[] },
  event: 'SessionStart' | 'PostToolUse',
): string {
  return proposalReply(arrivals, event)?.hookSpecificOutput.additionalContext ?? '';
}

describe('proposing a machine and a skill for what a project brought', () => {
  it('says nothing when nothing arrived, so a look about nothing stays quiet', () => {
    expect(
      proposalReply({ dependencies: [], decisions: [], kinds: [] }, 'SessionStart'),
    ).toBeUndefined();
  });

  it('names a dependency and sends the session down both routes', () => {
    const context = contextOf(only(['drizzle-orm']), 'SessionStart');

    expect(context).toContain('drizzle-orm');
    expect(context).toContain('mechanical-checks');
    expect(context).toContain('find-skills');
  });

  it('names a decision a project recorded', () => {
    const context = contextOf(
      { dependencies: [], decisions: ['Use Postgres over MySQL'], kinds: [] },
      'SessionStart',
    );

    expect(context).toContain('Use Postgres over MySQL');
  });

  it('names a file kind a write brought', () => {
    const context = contextOf({ dependencies: [], decisions: [], kinds: ['.tf'] }, 'PostToolUse');

    expect(context).toContain('.tf');
  });

  it('names each source under its own line, so one is not read as another', () => {
    const context = contextOf(
      { dependencies: ['redis'], decisions: ['A choice'], kinds: ['.tf'] },
      'PostToolUse',
    );
    const lines = context.split('\n');

    expect(lines.some((line) => line.includes('redis'))).toBe(true);
    expect(lines.some((line) => line.includes('A choice'))).toBe(true);
    expect(lines.some((line) => line.includes('.tf'))).toBe(true);
  });

  it('answers in the shape of the event that asked', () => {
    expect(proposalReply(only(['redis']), 'PostToolUse')?.hookSpecificOutput.hookEventName).toBe(
      'PostToolUse',
    );
  });

  it('never carries a decision key, since a look refuses nothing', () => {
    expect(Object.keys(proposalReply(only(['redis']), 'SessionStart') ?? {})).toStrictEqual([
      'hookSpecificOutput',
    ]);
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

  it('falls back to session start for an envelope that is no record at all', () => {
    expect(proposalEventFrom(null)).toBe('SessionStart');
  });

  it('falls back to session start for an event the reply has no shape for', () => {
    expect(proposalEventFrom({ hook_event_name: 'Stop' })).toBe('SessionStart');
  });
});
