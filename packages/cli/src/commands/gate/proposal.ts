const HEADING = 'new since ket last looked:';

const ASKING =
  'Each one brings a rule this project would otherwise keep by hand. Use the ' +
  'ket:mechanical-checks skill: research the check that would keep it, judge whether it earns ' +
  'its cost, and propose it. ket proposes, the user decides.';

const BETWEEN = ', ';

export interface ProposalReply {
  hookSpecificOutput: {
    hookEventName: 'SessionStart';
    additionalContext: string;
  };
}

export function proposalReply(arrivals: string[]): ProposalReply | undefined {
  if (arrivals.length === 0) {
    return undefined;
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `${HEADING} ${arrivals.join(BETWEEN)}\n\n${ASKING}`,
    },
  };
}
