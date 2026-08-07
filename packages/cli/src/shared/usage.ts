const HELP_FLAGS = new Set(['--help', '-h']);

export type UsageRequest = 'top-level' | 'command' | 'none';

const HOME_COMMAND = 'watch';

// Without a terminal the board has nothing to draw on, so a piped ket keeps
// printing usage rather than hanging a script on a render that never ends.
export function homeArgv(argv: string[], onTerminal: boolean): string[] {
  return argv.length === 0 && onTerminal ? [HOME_COMMAND] : argv;
}

export function usageRequest(argv: string[]): UsageRequest {
  const [first] = argv;

  if (first === undefined || HELP_FLAGS.has(first)) {
    return 'top-level';
  }

  return argv.some((argument) => HELP_FLAGS.has(argument)) ? 'command' : 'none';
}
