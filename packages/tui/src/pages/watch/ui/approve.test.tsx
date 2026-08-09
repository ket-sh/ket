import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const OFFERED = '‖ press a to approve';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function settled(): Promise<string> {
  await rendered?.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered?.renderOnce();

  return rendered?.captureCharFrame() ?? '';
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 15_000) {
    frame = await settled();
  }

  return frame;
}

async function openedWaitingJourney(feed: ActedFeed): Promise<ReturnType<typeof createMockKeys>> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('RETURN');
  await landed((seen) => seen.includes('K-2 · journey'));

  return keys;
}

describe('the offer the item legend extends at a human gate', () => {
  it('spells the approve offer in the pane', async () => {
    await openedWaitingJourney(feedOf());

    const frame = await landed((seen) => seen.includes(OFFERED));

    expect(frame).toContain(OFFERED);
  });

  // The escape key is left alone here: the ceremony curtain closes a passed
  // gate on its own after sixteen ticks, and a pressed escape racing that
  // curtain on a slow runner pops the journey instead of the gate.
  it('opens the ceremony on a and moves the item through it', async () => {
    const feed = feedOf();
    const keys = await openedWaitingJourney(feed);

    await landed((seen) => seen.includes(OFFERED));
    keys.pressKey('a');
    await landed((seen) => seen.includes('approve gate'));
    keys.pressKey('RETURN');
    await landed((seen) => seen.includes('passed'));

    expect(feed.acted).toContain('K-2 approve');

    const refolded = await landed(
      (seen) =>
        seen.includes('K-2 · journey') && seen.includes('implementing') && !seen.includes('passed'),
    );

    expect(refolded).toContain('K-2 · journey');
    expect(refolded).toContain('implementing');
    expect(refolded).not.toContain(OFFERED);
  });
});
