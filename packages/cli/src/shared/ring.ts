import type { RingCheck } from '@ket/preset';

const LOCAL_BIN = './node_modules/.bin/';

const ANCHOR = './';

const ARGUMENT_SEPARATOR = ' ';

export interface RingFailure {
  runs: string;
  said: string;
}

// A written path is chosen by whatever asked for the write, so a file named
// --fix would otherwise reach the linter as the flag it looks like. Anchoring it
// makes it unambiguously a path without relying on the tool understanding --.
function asPath(path: string): string {
  return path.startsWith(ANCHOR) || path.startsWith('/') ? path : `${ANCHOR}${path}`;
}

// A tool the project's bin directory shims runs through that shim, so a global
// install cannot shadow it. Anything else, like the runtime itself, has no shim
// to run through and resolves from the PATH.
export function argvOf(runs: string, localBins: ReadonlySet<string>): string[] {
  return runs
    .split(ARGUMENT_SEPARATOR)
    .map((part, at) => (at === 0 && localBins.has(part) ? `${LOCAL_BIN}${part}` : part));
}

// A check with nothing to look at has no command. Running it bare would sweep
// the whole project, which is the cost ring one exists to avoid.
export function argvFor(
  check: RingCheck,
  covering: string[],
  path: string,
  localBins: ReadonlySet<string>,
): string[] | undefined {
  const argv = argvOf(check.runs, localBins);

  if (check.scope === 'file') {
    return [...argv, asPath(path)];
  }

  if (check.scope === 'project') {
    return argv;
  }

  return covering.length === 0 ? undefined : [...argv, ...covering.map(asPath)];
}
