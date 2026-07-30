import type { Verdict } from '../../shared/verdict.ts';

export interface Denial {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny';
    permissionDecisionReason: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function namedIn(envelope: unknown, field: string): string | undefined {
  const input = isRecord(envelope) ? envelope['tool_input'] : undefined;
  const named = isRecord(input) ? input[field] : undefined;

  return typeof named === 'string' ? named : undefined;
}

export function pathFrom(envelope: unknown): string | undefined {
  return namedIn(envelope, 'file_path');
}

export function commandFrom(envelope: unknown): string | undefined {
  return namedIn(envelope, 'command');
}

function refusal(reason: string): Denial {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

export function verdictReply(verdict: Verdict): Denial | undefined {
  return 'refused' in verdict ? refusal(verdict.refused) : undefined;
}
