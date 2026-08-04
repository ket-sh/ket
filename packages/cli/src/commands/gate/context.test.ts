import { describe, expect, it } from 'vitest';

import { envelopeFrom } from './context.ts';

describe('reading the envelope a hook piped in', () => {
  it('parses the object the runtime sent', () => {
    expect(envelopeFrom('{"hook_event_name":"PostToolUse"}')).toStrictEqual({
      hook_event_name: 'PostToolUse',
    });
  });

  it('reads nothing from an empty stdin, since a session start pipes none', () => {
    expect(envelopeFrom('')).toBeUndefined();
  });

  it('reads nothing from a payload that is not json, rather than throwing on it', () => {
    expect(envelopeFrom('{ not json')).toBeUndefined();
  });
});
