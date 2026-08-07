import { describe, expect, it } from 'vitest';

import { renderEvent } from './event.ts';

describe('recording what a gate did', () => {
  it('writes one line, since the file is read a line at a time', () => {
    const line = renderEvent({ gate: 'write', outcome: 'refused', about: 'src/auth.ts' });

    expect(line.split('\n')).toHaveLength(2);
  });

  it('ends with a newline, so the next append starts its own line', () => {
    expect(
      renderEvent({ gate: 'write', outcome: 'allowed', about: 'src/auth.ts' }).endsWith('\n'),
    ).toBe(true);
  });

  it('records the gate, the outcome and what it looked at', () => {
    const parsed: unknown = JSON.parse(
      renderEvent({ gate: 'probe', outcome: 'allowed', about: 'src/auth.ts' }),
    );

    expect(parsed).toStrictEqual({ gate: 'probe', outcome: 'allowed', about: 'src/auth.ts' });
  });

  it('records the item when a gate knew which one it was', () => {
    const parsed: unknown = JSON.parse(
      renderEvent({ gate: 'write', outcome: 'refused', about: 'src/auth.ts', item: 'AUTH-1' }),
    );

    expect(parsed).toStrictEqual({
      gate: 'write',
      outcome: 'refused',
      about: 'src/auth.ts',
      item: 'AUTH-1',
    });
  });
});

describe('when a recorded line happened', () => {
  it('carries the moment it was stamped with, so a reader can measure time between lines', () => {
    const parsed: unknown = JSON.parse(
      renderEvent({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'AUTH-1',
        at: '2026-08-07T10:00:00.000Z',
      }),
    );

    expect(parsed).toMatchObject({ at: '2026-08-07T10:00:00.000Z' });
  });
});

describe('what a recorded line leaves out', () => {
  it('records the reason a refusal gave, since that is what a reader wants', () => {
    const parsed: unknown = JSON.parse(
      renderEvent({
        gate: 'write',
        outcome: 'refused',
        about: 'src/auth.ts',
        reason: 'AUTH-1 is triaged',
      }),
    );

    expect(parsed).toMatchObject({ reason: 'AUTH-1 is triaged' });
  });

  it('leaves out what it was not told, rather than writing a null', () => {
    expect(renderEvent({ gate: 'write', outcome: 'allowed', about: 'src/auth.ts' })).not.toContain(
      'null',
    );
  });

  it('survives a reason carrying a quote, since a refusal names paths', () => {
    const parsed: unknown = JSON.parse(
      renderEvent({
        gate: 'write',
        outcome: 'refused',
        about: 'src/a"b.ts',
        reason: 'it was never "trivial"',
      }),
    );

    expect(parsed).toMatchObject({ about: 'src/a"b.ts', reason: 'it was never "trivial"' });
  });
});
