import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Press = string | { key: string; ctrl?: boolean; lands?: string };

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

async function landed(marker: string | undefined): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (marker !== undefined && !frame.includes(marker) && Date.now() - started < 5000) {
    frame = await settled();
  }

  return frame;
}

function pressedOf(press: Press): { key: string; ctrl: boolean; lands: string | undefined } {
  if (typeof press === 'string') {
    return { key: press, ctrl: false, lands: undefined };
  }

  return { key: press.key, ctrl: press.ctrl ?? false, lands: press.lands };
}

async function opening(presses: Press[], feed: ActedFeed = feedOf()): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed('K-2');

  for (const press of presses) {
    const { key, ctrl, lands } = pressedOf(press);

    createMockKeys(opened.renderer).pressKey(key, { ctrl });
    frame = await landed(lands);
  }

  return frame;
}

const CRITERIA_PATH: Press[] = [
  { key: 'RETURN', lands: 'K-2 · journey' },
  'ARROW_RIGHT',
  { key: 'RETURN', lands: 'K-2 · Criteria' },
];

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
