import type { RingCheck } from '@ket/preset-cli';

const LOCAL_BIN = './node_modules/.bin/';

const HEADING = 'ring 1 found something.';

export interface RingFailure {
  runs: string;
  said: string;
}

export interface ProbeReply {
  hookSpecificOutput: {
    hookEventName: 'PostToolUse';
    additionalContext: string;
  };
}

export function argvFor(check: RingCheck, path: string): string[] {
  const argv = check.runs.split(' ').map((part, at) => (at === 0 ? `${LOCAL_BIN}${part}` : part));

  return check.scope === 'file' ? [...argv, path] : argv;
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
