import type { GateSemantics } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { declaredGateEventFor } from '../../shared/declared-gates.ts';
import { renderEvent } from '../../shared/event.ts';
import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

function gateOf(script: string): GateSemantics {
  return { script, guards: `It guards ${script}.`, commitJob: script, ciJob: 'check' };
}

const DUP = gateOf('lint:dup');

function moved(to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item: 'K-1', at })}\n`;
}

function recorded(gate: string, outcome: string, at: string): string {
  return `${JSON.stringify({ gate, outcome, about: 'src/a.ts', item: 'K-1', at })}\n`;
}

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate, outcome: 'refused', about: 'src/a.ts', item: 'K-1', at, reason })}\n`;
}

function ranThrough(script: string, at: string): string {
  return renderEvent({ ...declaredGateEventFor(script, `bun run ${script}`), at });
}

const BUSY = moved('triaged', '2026-08-04T09:00:00.000Z');

function dormantOf(log: string, gates: GateSemantics[]) {
  const action = foldRetro(WORKING, log, WINDOW, gates).actions.at(0);

  return action !== undefined && 'dormant' in action ? action.dormant : undefined;
}

function quietGateOf(log: string, gates: GateSemantics[]): string | undefined {
  return dormantOf(log, gates)?.gate;
}

describe('the gate a busy window with nothing refused leaves quiet', () => {
  it('names the configured gate the log has never recorded', () => {
    expect(dormantOf(BUSY, [DUP])).toStrictEqual({
      gate: 'lint:dup',
      guards: 'It guards lint:dup.',
      seen: undefined,
    });
  });

  it('leaves out a gate the window recorded, even where it let the work through', () => {
    const log = BUSY + recorded('lint:dup', 'allowed', '2026-08-04T10:00:00.000Z');

    expect(dormantOf(log, [DUP, gateOf('lint:dead')])).toStrictEqual({
      gate: 'lint:dead',
      guards: 'It guards lint:dead.',
      seen: undefined,
    });
  });

  it('asks for nothing when every configured gate was recorded in the window', () => {
    const log = BUSY + recorded('lint:dup', 'allowed', '2026-08-04T10:00:00.000Z');

    expect(dormantOf(log, [DUP])).toBeUndefined();
  });

  it('asks for nothing when the project declares no gate at all', () => {
    expect(dormantOf(BUSY, [])).toBeUndefined();
  });
});

describe('the activity a quiet gate needs before it is worth naming', () => {
  it('asks for nothing when no item moved through the window', () => {
    expect(dormantOf('', [DUP])).toBeUndefined();
  });

  it('asks for nothing when the window carried events but moved no item', () => {
    const log = recorded('write', 'allowed', '2026-08-04T09:00:00.000Z');

    expect(dormantOf(log, [DUP])).toBeUndefined();
  });

  it('asks for nothing when the only move landed outside the window', () => {
    const log = moved('triaged', '2026-07-20T09:00:00.000Z');

    expect(dormantOf(log, [DUP])).toBeUndefined();
  });
});

describe('the moment history last recorded a quiet gate', () => {
  const OLDEST = '2026-07-01T09:00:00.000Z';

  const NEWEST = '2026-07-03T09:00:00.000Z';

  const HISTORY =
    recorded('lint:dup', 'refused', OLDEST) +
    recorded('lint:dup', 'allowed', '2026-07-02T09:00:00.000Z') +
    recorded('lint:dup', 'allowed', NEWEST);

  it('carries the last of several recordings, not an earlier one', () => {
    expect(dormantOf(HISTORY + BUSY, [DUP])).toStrictEqual({
      gate: 'lint:dup',
      guards: 'It guards lint:dup.',
      seen: Date.parse(NEWEST),
    });
  });

  it('reads only what the gate itself was recorded for, not the log as a whole', () => {
    const log = recorded('lint:dup', 'allowed', OLDEST) + BUSY;

    expect(dormantOf(log, [DUP])).toStrictEqual({
      gate: 'lint:dup',
      guards: 'It guards lint:dup.',
      seen: Date.parse(OLDEST),
    });
  });
});

describe('the quietest gate among several the window left alone', () => {
  it('prefers the gate no history recorded over one recorded long ago', () => {
    const log = recorded('check-types', 'allowed', '2026-07-01T09:00:00.000Z') + BUSY;

    expect(quietGateOf(log, [gateOf('check-types'), gateOf('lint:spell')])).toBe('lint:spell');
  });

  it('names the gate history recorded longest ago when history recorded them all', () => {
    const log =
      recorded('check-types', 'allowed', '2026-07-01T09:00:00.000Z') +
      recorded('lint:spell', 'allowed', '2026-07-05T09:00:00.000Z') +
      BUSY;

    expect(quietGateOf(log, [gateOf('lint:spell'), gateOf('check-types')])).toBe('check-types');
  });

  it('settles a tie between two gates history never recorded on the gate name', () => {
    expect(quietGateOf(BUSY, [gateOf('lint:spell'), gateOf('check-types')])).toBe('check-types');
  });

  it('settles a tie between two gates recorded at one moment on the gate name', () => {
    const at = '2026-07-01T09:00:00.000Z';
    const log =
      recorded('lint:spell', 'allowed', at) + recorded('check-types', 'allowed', at) + BUSY;

    expect(quietGateOf(log, [gateOf('lint:spell'), gateOf('check-types')])).toBe('check-types');
  });
});

describe('a declared gate run the shell gate recorded', () => {
  it('stops reading as never recorded once its run reaches the log', () => {
    const at = '2026-07-02T09:00:00.000Z';
    const log = ranThrough('lint:dup', at) + BUSY;

    expect(dormantOf(log, [DUP])).toStrictEqual({
      gate: 'lint:dup',
      guards: 'It guards lint:dup.',
      seen: Date.parse(at),
    });
  });

  it('ranks two quiet gates by the moments their runs were recorded, not by name', () => {
    const log =
      ranThrough('lint:spell', '2026-07-01T09:00:00.000Z') +
      ranThrough('check-types', '2026-07-05T09:00:00.000Z') +
      BUSY;

    expect(quietGateOf(log, [gateOf('check-types'), gateOf('lint:spell')])).toBe('lint:spell');
  });
});

describe('the arm a refusal keeps for itself', () => {
  it('takes the action from the refusal cluster, leaving the quiet gate unnamed', () => {
    const log = BUSY + turnedAway('write', '2026-08-04T10:00:00.000Z', 'the test comes first');
    const action = foldRetro(WORKING, log, WINDOW, [DUP]).actions.at(0);

    expect(dormantOf(log, [DUP])).toBeUndefined();
    expect(action !== undefined && 'cluster' in action).toBe(true);
  });
});
