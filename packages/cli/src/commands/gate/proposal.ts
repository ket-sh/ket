import { eventNameFrom } from './envelope.ts';

const HEADING = 'new since ket last looked:';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand, and a craft a skill can ' +
  'teach. Use the ket:mechanical-checks skill: research the check that would keep the rule, ' +
  'judge whether it earns its cost, and propose it. Use the find-skills skill: look for a skill ' +
  'that teaches the dependency, and propose installing it, with skills-lock.json recording a ' +
  'yes. Each proposal stands on its own. ket proposes, the user decides.';

const BETWEEN = ', ';

export type ProposalEvent = 'SessionStart' | 'PostToolUse';

export interface ProposalReply {
  hookSpecificOutput: {
    hookEventName: ProposalEvent;
    additionalContext: string;
  };
}

const MID_SESSION = 'PostToolUse';

export function proposalEventFrom(envelope: unknown): ProposalEvent {
  return eventNameFrom(envelope) === MID_SESSION ? MID_SESSION : 'SessionStart';
}

export function proposalReply(arrivals: string[], event: ProposalEvent): ProposalReply | undefined {
  if (arrivals.length === 0) {
    return undefined;
  }

  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: `${HEADING} ${arrivals.join(BETWEEN)}\n\n${ASKING}`,
    },
  };
}
