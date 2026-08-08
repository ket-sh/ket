import { describe, expect, it } from 'vitest';

import { quietGate } from './quiet.ts';

function clockAt(start: number): { now: () => number; pass: (ms: number) => void } {
  let moment = start;

  return {
    now: () => moment,
    pass: (ms: number) => {
      moment += ms;
    },
  };
}

describe('the quiet a save buys from the watcher', () => {
  it('speaks while nothing was saved', () => {
    const gate = quietGate(clockAt(1000).now);

    expect(gate.loud()).toBe(true);
  });

  it('swallows every straggling event inside the grace window, not only the first', () => {
    const clock = clockAt(1000);
    const gate = quietGate(clock.now);

    gate.hush();

    expect(gate.loud()).toBe(false);
    clock.pass(499);
    expect(gate.loud()).toBe(false);
  });

  it('speaks again the moment the grace window closes', () => {
    const clock = clockAt(1000);
    const gate = quietGate(clock.now);

    gate.hush();
    clock.pass(500);

    expect(gate.loud()).toBe(true);
  });

  it('buys a fresh window with every save', () => {
    const clock = clockAt(1000);
    const gate = quietGate(clock.now);

    gate.hush();
    clock.pass(400);
    gate.hush();
    clock.pass(400);

    expect(gate.loud()).toBe(false);
  });
});
