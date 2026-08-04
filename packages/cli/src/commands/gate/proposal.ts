import { eventNameFrom } from './envelope.ts';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand, and a craft a skill can ' +
  'teach. Use the ket:mechanical-checks skill: research the check that would keep the rule, ' +
  'judge whether it earns its cost, and propose it. Use the find-skills skill: look for a skill ' +
  'that teaches it, and propose installing it, with skills-lock.json recording a yes. Each ' +
  'proposal stands on its own. ket proposes, the user decides.';

const BETWEEN = ', ';

export type ProposalEvent = 'SessionStart' | 'PostToolUse';

export interface ProposalReply {
  hookSpecificOutput: {
    hookEventName: ProposalEvent;
    additionalContext: string;
  };
}

interface Arrivals {
  dependencies: string[];
  decisions: string[];
  kinds: string[];
}

const MID_SESSION = 'PostToolUse';

export function proposalEventFrom(envelope: unknown): ProposalEvent {
  return eventNameFrom(envelope) === MID_SESSION ? MID_SESSION : 'SessionStart';
}

function lineFor(heading: string, names: string[]): string[] {
  return names.length === 0 ? [] : [`${heading} ${names.join(BETWEEN)}`];
}

function headingsFor(arrivals: Arrivals): string {
  return [
    ...lineFor('new dependencies since ket last looked:', arrivals.dependencies),
    ...lineFor('decisions this project recorded:', arrivals.decisions),
    ...lineFor('file kinds new to this project:', arrivals.kinds),
  ].join('\n');
}

export function proposalReply(arrivals: Arrivals, event: ProposalEvent): ProposalReply | undefined {
  const headings = headingsFor(arrivals);

  if (headings === '') {
    return undefined;
  }

  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: `${headings}\n\n${ASKING}`,
    },
  };
}
