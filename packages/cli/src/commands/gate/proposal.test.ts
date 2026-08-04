import { describe, expect, it } from 'vitest';

import { proposalEventFrom, proposalReply } from './proposal.ts';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand, and a craft a skill can ' +
  'teach. Use the ket:mechanical-checks skill: research the check that would keep the rule, ' +
  'judge whether it earns its cost, and propose it. Use the find-skills skill: look for a skill ' +
  'that teaches it, and propose installing it, with skills-lock.json recording a yes. Each ' +
  'proposal stands on its own. ket proposes, the user decides.';

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

  it('names a dependency under its heading and sends the session down both routes', () => {
    expect(contextOf(only(['drizzle-orm']), 'SessionStart')).toBe(
      `new dependencies since ket last looked: drizzle-orm\n\n${ASKING}`,
    );
  });

  it('joins two arrivals of one kind with a comma', () => {
    expect(
      contextOf({ dependencies: ['kafka', 'redis'], decisions: [], kinds: [] }, 'SessionStart'),
    ).toBe(`new dependencies since ket last looked: kafka, redis\n\n${ASKING}`);
  });

  it('names a decision a project recorded under its own heading', () => {
    expect(
      contextOf(
        { dependencies: [], decisions: ['Use Postgres over MySQL'], kinds: [] },
        'SessionStart',
      ),
    ).toBe(`decisions this project recorded: Use Postgres over MySQL\n\n${ASKING}`);
  });

  it('names a file kind a write brought under its own heading', () => {
    expect(contextOf({ dependencies: [], decisions: [], kinds: ['.tf'] }, 'PostToolUse')).toBe(
      `file kinds new to this project: .tf\n\n${ASKING}`,
    );
  });

  it('names each source under its own line, so one is not read as another', () => {
    const lines = contextOf(
      { dependencies: ['redis'], decisions: ['A choice'], kinds: ['.tf'] },
      'PostToolUse',
    ).split('\n');
    const lineWith = (name: string): string | undefined =>
      lines.find((line) => line.includes(name));

    expect(lineWith('redis')).not.toBe(lineWith('A choice'));
    expect(lineWith('A choice')).not.toBe(lineWith('.tf'));
    expect(lineWith('redis')).toBeDefined();
    expect(lineWith('.tf')).toBeDefined();
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
