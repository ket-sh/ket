import type { RingCheck } from '@ket/preset-cli';

const LOCAL_BIN = './node_modules/.bin/';

const ANCHOR = './';

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

// A written path is chosen by whatever asked for the write, so a file named
// --fix would otherwise reach the linter as the flag it looks like. Anchoring it
// makes it unambiguously a path without relying on the tool understanding --.
function asPath(path: string): string {
  return path.startsWith(ANCHOR) || path.startsWith('/') ? path : `${ANCHOR}${path}`;
}

// A check with nothing to look at has no command. Running it bare would sweep
// the whole project, which is the cost ring one exists to avoid.
export function argvFor(check: RingCheck, covering: string[], path: string): string[] | undefined {
  const argv = check.runs.split(' ').map((part, at) => (at === 0 ? `${LOCAL_BIN}${part}` : part));

  if (check.scope === 'file') {
    return [...argv, asPath(path)];
  }

  if (check.scope === 'project') {
    return argv;
  }

  return covering.length === 0 ? undefined : [...argv, ...covering.map(asPath)];
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
