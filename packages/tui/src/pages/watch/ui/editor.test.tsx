import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Press = string | { key: string; ctrl?: boolean; lands?: string; leaves?: string };

function keyed(press: Press): { key: string; ctrl: boolean } {
  if (typeof press === 'string') {
    return { key: press, ctrl: false };
  }

  return { key: press.key, ctrl: press.ctrl ?? false };
}

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
    const { key, ctrl } = keyed(press);

    createMockKeys(opened.renderer).pressKey(key, { ctrl });
    frame = await landed(settledDown(press));
  }

  return frame;
}

const CRITERIA_PATH: Press[] = [
  { key: 'RETURN', lands: 'K-2 · journey' },
  { key: 'ARROW_RIGHT', lands: '║ locking.feature' },
  { key: 'RETURN', lands: 'K-2 · Criteria' },
];

const OPENED: Press = { key: 'e', lands: 'ctrl+s save' };

const TYPED: Press = { key: 'x', lands: 'locking.feature ●' };

describe('the criteria a keeper edits in place', () => {
  it('opens the editor with e on a criteria surface', async () => {
    const frame = await opening([...CRITERIA_PATH, OPENED]);

    expect(frame).toContain('locking.feature');
    expect(frame).toContain('ctrl+s save');
  });

  it('keeps q as a letter while editing', async () => {
    const frame = await opening([...CRITERIA_PATH, OPENED, { key: 'q', lands: 'qFeature' }]);

    expect(frame).toContain('qFeature: locking');
  });

  it('wears the unsaved mark once typing starts', async () => {
    const frame = await opening([...CRITERIA_PATH, OPENED, TYPED]);

    expect(frame).toContain('locking.feature ●');
  });

  it('leaves e alone on a prose surface', async () => {
    const frame = await opening([
      { key: 'ARROW_RIGHT', lands: '║ K-1' },
      { key: 'RETURN', lands: 'K-1 · journey' },
      { key: 'ARROW_DOWN', lands: '║ spec.md' },
      { key: 'RETURN', lands: 'K-1 · Spec' },
      'e',
    ]);

    expect(frame).toContain('K-1 · Spec');
    expect(frame).not.toContain('ctrl+s save');
  });
});

describe('the draft the keeper saves or leaves', () => {
  it('saves through the feed and flashes the confirmation', async () => {
    const feed = feedOf();
    const frame = await opening(
      [...CRITERIA_PATH, OPENED, TYPED, { key: 's', ctrl: true, lands: 'saved ✓' }],
      feed,
    );

    expect(frame).toContain('saved ✓');
    expect(frame).not.toContain('locking.feature ●');
    expect(feed.saved).toStrictEqual([
      'K-2 locking.feature xFeature: locking\n  Scenario: five tries',
    ]);
  });

  it('returns to the surface on escape', async () => {
    const frame = await opening([
      ...CRITERIA_PATH,
      OPENED,
      { key: 'ESCAPE', leaves: 'ctrl+s save' },
    ]);

    expect(frame).toContain('K-2 · Criteria');
  });
});
