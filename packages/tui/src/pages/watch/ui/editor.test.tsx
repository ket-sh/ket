import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Press = string | { key: string; ctrl: boolean };

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

async function opening(presses: Press[], feed: ActedFeed = feedOf()): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await settled();

  while (!frame.includes('K-2')) {
    frame = await settled();
  }

  for (const press of presses) {
    if (typeof press === 'string') {
      createMockKeys(opened.renderer).pressKey(press);
    } else {
      createMockKeys(opened.renderer).pressKey(press.key, { ctrl: press.ctrl });
    }

    frame = await settled();
  }

  return frame;
}

const CRITERIA_PATH: Press[] = ['RETURN', 'ARROW_RIGHT', 'RETURN'];

describe('the criteria a keeper edits in place', () => {
  it('opens the editor with e on a criteria surface', async () => {
    const frame = await opening([...CRITERIA_PATH, 'e']);

    expect(frame).toContain('locking.feature');
    expect(frame).toContain('ctrl+s save');
  });

  it('keeps q as a letter while editing', async () => {
    const frame = await opening([...CRITERIA_PATH, 'e', 'q']);

    expect(frame).toContain('qFeature: locking');
  });

  it('wears the unsaved mark once typing starts', async () => {
    const frame = await opening([...CRITERIA_PATH, 'e', 'x']);

    expect(frame).toContain('locking.feature ●');
  });

  it('saves through the feed and flashes the confirmation', async () => {
    const feed = feedOf();
    const frame = await opening([...CRITERIA_PATH, 'e', 'x', { key: 's', ctrl: true }], feed);

    expect(frame).toContain('saved ✓');
    expect(frame).not.toContain('locking.feature ●');
    expect(feed.saved).toStrictEqual([
      'K-2 locking.feature xFeature: locking\n  Scenario: five tries',
    ]);
  });

  it('leaves e alone on a prose surface', async () => {
    const frame = await opening(['ARROW_RIGHT', 'RETURN', 'ARROW_DOWN', 'RETURN', 'e']);

    expect(frame).toContain('K-1 · Spec');
    expect(frame).not.toContain('ctrl+s save');
  });

  it('returns to the surface on escape', async () => {
    const frame = await opening([...CRITERIA_PATH, 'e', 'ESCAPE']);

    expect(frame).toContain('K-2 · Criteria');
  });
});
