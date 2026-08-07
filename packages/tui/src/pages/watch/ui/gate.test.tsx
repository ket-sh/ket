import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

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

type Press = string | { key: string; lands?: string; leaves?: string };

function settledDown(press: Press): (frame: string) => boolean {
  if (typeof press === 'string') {
    return () => true;
  }

  return (frame) =>
    (press.lands === undefined || frame.includes(press.lands)) &&
    (press.leaves === undefined || !frame.includes(press.leaves));
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 15_000) {
    frame = await settled();
  }

  return frame;
}

async function opening(presses: Press[], feed: ActedFeed = feedOf()): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(typeof press === 'string' ? press : press.key);
    frame = await landed(settledDown(press));
  }

  return frame;
}

const SEATED_AWAY: Press = { key: 'ARROW_RIGHT', lands: '║ K-1' };

const OFFERED: Press = { key: 'a', lands: 'approve gate' };

const PASSED: Press[] = [OFFERED, { key: 'RETURN', lands: '✓ passed' }];

describe('the gate hints a board offers', () => {
  it('lists the gate key only while the selected card offers it', async () => {
    const frame = await opening([]);

    expect(frame).toContain('a approve');
  });

  it('drops the gate hint when the selection stands elsewhere', async () => {
    const frame = await opening([SEATED_AWAY]);

    expect(frame).not.toContain('a approve');
  });

  it('answers an unoffered gate key with nothing', async () => {
    const frame = await opening([SEATED_AWAY, 'a']);

    expect(frame).not.toContain('approve gate');
  });
});

describe('the ceremony an offered gate opens', () => {
  it('opens on the gate key with the transition chips', async () => {
    const frame = await opening([OFFERED]);

    expect(frame).toContain('approve gate');
    expect(frame).toContain('──►');
    expect(frame).toContain('pass ⏎');
  });

  it('passes the gate on enter and celebrates', async () => {
    const feed = feedOf();
    const frame = await opening(PASSED, feed);

    expect(frame).toContain('✓ passed');
    expect(feed.acted).toStrictEqual(['K-2 approve']);
  });

  it('closes itself once the celebration ends', async () => {
    await opening(PASSED);

    const frame = await landed((seen) => !seen.includes('approve gate'));

    expect(frame).not.toContain('approve gate');
  }, 20_000);

  it('shows the refusal and its reason', async () => {
    const feed = feedOf();

    feed.act = async () => Promise.resolve({ refused: 'the design names no spec' });

    const frame = await opening([OFFERED, { key: 'RETURN', lands: '✗ refused' }], feed);

    expect(frame).toContain('✗ refused');
    expect(frame).toContain('the design names no spec');
  });

  it('cancels on escape without acting', async () => {
    const feed = feedOf();
    const frame = await opening([OFFERED, { key: 'ESCAPE', leaves: 'approve gate' }], feed);

    expect(frame).not.toContain('approve gate');
    expect(feed.acted).toStrictEqual([]);
  });
});
