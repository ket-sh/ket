import type { Verdict } from '../../shared/verdict.ts';

export interface Denial {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny';
    permissionDecisionReason: string;
  };
}

const SESSION_FILE = '.jsonl';

const SUBAGENTS = 'subagents';

const AGENT_NAME = /^[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fieldFrom(envelope: unknown, field: string): unknown {
  return isRecord(envelope) ? envelope[field] : undefined;
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

// Claude Code sends the parent session's transcript even when a subagent made
// the call, so a gate that reads it judges a conversation the acting agent never
// had. The agent's own transcript sits beside the session file, under its id.
function beside(session: string, acting: unknown): string | undefined {
  if (typeof acting !== 'string' || !AGENT_NAME.test(acting)) {
    return undefined;
  }

  if (!session.endsWith(SESSION_FILE)) {
    return undefined;
  }

  const directory = session.slice(0, -SESSION_FILE.length);

  return `${directory}/${SUBAGENTS}/agent-${acting}${SESSION_FILE}`;
}

export function actingTranscript(envelope: unknown): string | undefined {
  const session = fieldFrom(envelope, 'transcript_path');

  if (typeof session !== 'string' || session === '') {
    return undefined;
  }

  const acting = fieldFrom(envelope, 'agent_id');

  return acting === undefined ? session : beside(session, acting);
}

export function pointedAt(envelope: unknown, transcript: string): string {
  return JSON.stringify({
    ...(isRecord(envelope) ? envelope : {}),
    transcript_path: transcript,
  });
}

export function refusal(reason: string): Denial {
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
