import type { RingFailure } from '../../shared/ring.ts';

const HEADING = 'ring 1 found something.';

export interface ProbeReply {
  hookSpecificOutput: {
    hookEventName: 'PostToolUse';
    additionalContext: string;
  };
}

export function probeReply(failures: RingFailure[]): ProbeReply | undefined {
  if (failures.length === 0) {
    return undefined;
  }

  const told = failures.map((failure) => `${failure.runs}\n${failure.said}`).join('\n\n');

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `${HEADING}\n\n${told}`,
    },
  };
}
