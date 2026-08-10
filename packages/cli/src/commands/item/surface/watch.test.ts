import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmedByKnocking } from './watch.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function neverObserved(): Promise<void> {
  await new Promise<void>(() => {});
}

describe('the knocking that confirms a watch', () => {
  it('confirms once the watcher observes a knock', async () => {
    let sent = 0;
    let observe: () => void = () => {};
    const observed = new Promise<void>((resolveObserved) => {
      observe = resolveObserved;
    });
    const confirmed = confirmedByKnocking(
      observed,
      async () => {
        sent += 1;
        observe();
        await Promise.resolve();
      },
      10_000,
    );

    await vi.advanceTimersByTimeAsync(0);

    await expect(confirmed).resolves.toBe(true);
    expect(sent).toBe(1);
  });

  it('keeps knocking while the watcher stays silent and gives up at the bound', async () => {
    let sent = 0;
    const confirmed = confirmedByKnocking(
      neverObserved(),
      async () => {
        sent += 1;
        await Promise.resolve();
      },
      50,
    );

    await vi.advanceTimersByTimeAsync(60);

    await expect(confirmed).resolves.toBe(false);
    expect(sent).toBeGreaterThanOrEqual(2);
  });

  it('sends no knock where the bound is already spent', async () => {
    let sent = 0;
    const confirmed = confirmedByKnocking(
      neverObserved(),
      async () => {
        sent += 1;
        await Promise.resolve();
      },
      0,
    );

    await expect(confirmed).resolves.toBe(false);
    expect(sent).toBe(0);
  });
});
