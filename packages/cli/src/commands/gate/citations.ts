import type { Cited } from '../../shared/citations.ts';

import { citationsFrom, missingFrom } from '../../shared/citations.ts';

const HEADING = 'this design cites something the repository does not have.';

export interface CitationReply {
  hookSpecificOutput: {
    hookEventName: 'PostToolUse';
    additionalContext: string;
  };
}

export function pathsCitedIn(markdown: string): string[] {
  return citationsFrom(markdown).paths;
}

export function missingIn(markdown: string, read: Cited[]): string[] {
  const missing = missingFrom({ read, symbols: citationsFrom(markdown).symbols });

  return [
    ...missing.paths.map((path) => `${path} is cited and the repository has no such file`),
    ...missing.symbols.map((symbol) => `${symbol} is cited and none of the cited files defines it`),
  ];
}

export function citationReply(missing: string[]): CitationReply | undefined {
  if (missing.length === 0) {
    return undefined;
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `${HEADING}\n\n${missing.join('\n')}`,
    },
  };
}
