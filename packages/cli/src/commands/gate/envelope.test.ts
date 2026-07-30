import { describe, expect, it } from 'vitest';

import { commandFrom, pathFrom, verdictReply } from './envelope.ts';

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

describe('an envelope that is not there at all', () => {
  it('reads nothing from nothing', () => {
    expect(pathFrom(null)).toBeUndefined();
  });

  it('reads nothing when the tool input is null', () => {
    expect(pathFrom({ tool_input: null })).toBeUndefined();
  });
});
