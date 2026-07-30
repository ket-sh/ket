import { describe, expect, it } from 'vitest';

import { pathFrom, refusal, verdictReply } from './envelope.ts';

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

describe('refusing before any item is read', () => {
  it('names what it could not do, so the reason is never bare', () => {
    expect(refusal('no .ket directory above src/auth.ts')).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'no .ket directory above src/auth.ts',
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
