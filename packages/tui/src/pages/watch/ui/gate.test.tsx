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

type Press = string | { key: string; lands: string };

async function landed(marker: string | undefined): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (marker !== undefined && !frame.includes(marker) && Date.now() - started < 5000) {
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

  let frame = await landed('K-2');

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(typeof press === 'string' ? press : press.key);
    frame = await landed(typeof press === 'string' ? undefined : press.lands);
  }

  return frame;
}

async function until(seen: (frame: string) => boolean, patience: number): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (Date.now() - started < patience && !seen(frame)) {
    frame = await settled();
  }

  return frame;
}

describe('the gate a card stands before', () => {
  it('lists the gate key only while the selected card offers it', async () => {
    const frame = await opening([]);

    expect(frame).toContain('a approve');
  });

  it('drops the gate hint when the selection stands elsewhere', async () => {
    const frame = await opening(['ARROW_RIGHT']);

    expect(frame).not.toContain('a approve');
  });

  it('answers an unoffered gate key with nothing', async () => {
    const frame = await opening(['ARROW_RIGHT', 'a']);

    expect(frame).not.toContain('approve gate');
  });

  it('opens the ceremony on an offered gate key', async () => {
    const frame = await opening(['a']);

    expect(frame).toContain('approve gate');
    expect(frame).toContain('──►');
    expect(frame).toContain('pass ⏎');
  });

  it('passes the gate on enter and celebrates', async () => {
    const feed = feedOf();
    const frame = await opening(['a', { key: 'RETURN', lands: '✓ passed' }], feed);

    expect(frame).toContain('✓ passed');
    expect(feed.acted).toStrictEqual(['K-2 approve']);
  });

  it('closes the ceremony by itself once the celebration ends', async () => {
    await opening(['a', 'RETURN']);

    const frame = await until((seen) => !seen.includes('approve gate'), 5000);

    expect(frame).not.toContain('approve gate');
  }, 8000);

  it('shows the refusal and its reason', async () => {
    const feed = feedOf();

    feed.act = async () => Promise.resolve({ refused: 'the design names no spec' });

    const frame = await opening(['a', { key: 'RETURN', lands: '✗ refused' }], feed);

    expect(frame).toContain('✗ refused');
    expect(frame).toContain('the design names no spec');
  });

  it('cancels on escape without acting', async () => {
    const feed = feedOf();
    const frame = await opening(['a', 'ESCAPE'], feed);

    expect(frame).not.toContain('approve gate');
    expect(feed.acted).toStrictEqual([]);
  });
});
