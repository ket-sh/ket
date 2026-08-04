import { describe, expect, it } from 'vitest';

import {
  actingTranscript,
  commandFrom,
  eventNameFrom,
  overriddenBy,
  pathFrom,
  pointedAt,
  verdictReply,
} from './envelope.ts';

describe('reading which event a hook fired for', () => {
  it('names the event the envelope carries', () => {
    expect(eventNameFrom({ hook_event_name: 'PostToolUse' })).toBe('PostToolUse');
  });

  it('reads nothing from an envelope that names no event', () => {
    expect(eventNameFrom({})).toBeUndefined();
  });

  it('reads nothing from a payload that is not an object', () => {
    expect(eventNameFrom(undefined)).toBeUndefined();
  });

  it('reads nothing from an event spelled as anything but a string', () => {
    expect(eventNameFrom({ hook_event_name: 7 })).toBeUndefined();
  });
});

describe('whether the runtime has already overridden the stop hook', () => {
  it('reads the flag a stop envelope carries once a hook is driving the turn', () => {
    expect(overriddenBy({ hook_event_name: 'Stop', stop_hook_active: true })).toBe(true);
  });

  it('reads a fresh stop as one no hook has driven yet', () => {
    expect(overriddenBy({ hook_event_name: 'Stop', stop_hook_active: false })).toBe(false);
  });

  it('reads an envelope that carries no such flag as one no hook has driven', () => {
    expect(overriddenBy({ hook_event_name: 'Stop' })).toBe(false);
  });

  it('reads a flag spelled as anything but true as no override at all', () => {
    expect(overriddenBy({ stop_hook_active: 'true' })).toBe(false);
  });

  it('reads nothing from a payload that is not an object', () => {
    expect(overriddenBy('nonsense')).toBe(false);
  });
});

describe('reading the path a hook event is about', () => {
  it('reads the file a write names', () => {
    expect(pathFrom({ tool_input: { file_path: 'src/auth.ts' } })).toBe('src/auth.ts');
  });

  it('reads nothing from an envelope with no tool input', () => {
    expect(pathFrom({})).toBeUndefined();
  });

  it('reads nothing when the tool input names no file', () => {
    expect(pathFrom({ tool_input: { command: 'bun test' } })).toBeUndefined();
  });

  it('reads nothing when the file is not a string', () => {
    expect(pathFrom({ tool_input: { file_path: 7 } })).toBeUndefined();
  });

  it('reads nothing from a payload that is not an object', () => {
    expect(pathFrom('nonsense')).toBeUndefined();
  });
});

describe('reading the command a hook event is about', () => {
  it('reads the command a shell call names', () => {
    expect(commandFrom({ tool_input: { command: 'bun test' } })).toBe('bun test');
  });

  it('reads nothing when the tool input names no command', () => {
    expect(commandFrom({ tool_input: { file_path: 'src/auth.ts' } })).toBeUndefined();
  });

  it('reads nothing when the command is not a string', () => {
    expect(commandFrom({ tool_input: { command: 7 } })).toBeUndefined();
  });

  it('reads nothing from a payload that is not an object', () => {
    expect(commandFrom('nonsense')).toBeUndefined();
  });
});

describe('answering a pre-tool-use hook', () => {
  it('says nothing when the write is allowed, so the normal flow runs', () => {
    expect(verdictReply({ allowed: true })).toBeUndefined();
  });

  it('denies with the reason when the write is refused', () => {
    expect(verdictReply({ refused: 'AUTH-1 is triaged' })).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'AUTH-1 is triaged',
      },
    });
  });
});

describe('which conversation a tool call came from', () => {
  const SESSION = '/projects/ket/775f1355.jsonl';

  it('reads the session transcript when the main conversation acted', () => {
    expect(actingTranscript({ transcript_path: SESSION })).toBe(SESSION);
  });

  it('reads the acting subagent transcript, since the payload names the parent', () => {
    expect(actingTranscript({ transcript_path: SESSION, agent_id: 'a9267ab3ea' })).toBe(
      '/projects/ket/775f1355/subagents/agent-a9267ab3ea.jsonl',
    );
  });

  it('resolves nothing when the payload names no transcript', () => {
    expect(actingTranscript({ agent_id: 'a9267ab3ea' })).toBeUndefined();
  });

  it('resolves nothing when the transcript is not a string', () => {
    expect(actingTranscript({ transcript_path: 7 })).toBeUndefined();
  });

  it('resolves nothing when the transcript is named but empty', () => {
    expect(actingTranscript({ transcript_path: '' })).toBeUndefined();
  });

  it('resolves nothing when the transcript is not the file shape it derives from', () => {
    expect(
      actingTranscript({ transcript_path: '/projects/ket/775f1355', agent_id: 'a1' }),
    ).toBeUndefined();
  });

  it('resolves nothing rather than falling back when the agent is unreadable', () => {
    for (const agent_id of [7, '', '../../elsewhere', 'a/b']) {
      expect({
        agent_id,
        found: actingTranscript({ transcript_path: SESSION, agent_id }),
      }).toStrictEqual({
        agent_id,
        found: undefined,
      });
    }
  });

  it('resolves nothing from a payload that is not an object', () => {
    expect(actingTranscript('nonsense')).toBeUndefined();
  });
});

describe('handing an envelope to a gate that reads a transcript', () => {
  it('points it at the transcript the acting agent wrote', () => {
    const handed: unknown = JSON.parse(
      pointedAt({ transcript_path: '/parent.jsonl' }, '/child.jsonl'),
    );

    expect(handed).toStrictEqual({ transcript_path: '/child.jsonl' });
  });

  it('keeps everything else the gate needs to judge the write', () => {
    const handed: unknown = JSON.parse(
      pointedAt(
        {
          transcript_path: '/parent.jsonl',
          agent_id: 'a1',
          cwd: '/repo',
          tool_name: 'Write',
          tool_input: { file_path: 'src/auth.ts', content: 'export const a = 1;' },
        },
        '/child.jsonl',
      ),
    );

    expect(handed).toStrictEqual({
      transcript_path: '/child.jsonl',
      agent_id: 'a1',
      cwd: '/repo',
      tool_name: 'Write',
      tool_input: { file_path: 'src/auth.ts', content: 'export const a = 1;' },
    });
  });

  it('names the transcript even when there was no envelope to keep', () => {
    expect(JSON.parse(pointedAt('nonsense', '/child.jsonl'))).toStrictEqual({
      transcript_path: '/child.jsonl',
    });
  });
});

describe('an envelope that is not there at all', () => {
  it('reads nothing from nothing', () => {
    expect(pathFrom(null)).toBeUndefined();
  });

  it('reads nothing when the tool input is null', () => {
    expect(pathFrom({ tool_input: null })).toBeUndefined();
  });
});
