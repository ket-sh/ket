const HELP_FLAGS = new Set(['--help', '-h']);

export type UsageRequest = 'top-level' | 'command' | 'none';

export function usageRequest(argv: string[]): UsageRequest {
  const [first] = argv;

  if (first === undefined || HELP_FLAGS.has(first)) {
    return 'top-level';
  }

  return argv.some((argument) => HELP_FLAGS.has(argument)) ? 'command' : 'none';
}
