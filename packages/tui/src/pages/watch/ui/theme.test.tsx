import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { THEMES } from '../../../shared/theme';
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

async function opening(presses: Press[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
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

const SECOND = THEMES[1]?.[0] ?? '';

const PICKED: Press = { key: 't', lands: 'themes' };

const BROWSED: Press = { key: 'ARROW_DOWN', lands: `► ${SECOND}` };

describe('the theme picker over the watch', () => {
  it('opens on t and lists the wardrobe with color strips', async () => {
    const frame = await opening([PICKED]);

    expect(frame).toContain('themes');
    expect(frame).toContain(SECOND);
    expect(frame).toContain('██');
  });

  it('names the worn theme in the header', async () => {
    const frame = await opening([]);

    expect(frame).toContain('kanagawa');
  });

  it('previews the selection while the picker is open', async () => {
    const frame = await opening([PICKED, BROWSED]);

    const header = frame.split('\n').find((row) => row.includes('●')) ?? '';

    expect(header).toContain(SECOND);
  });

  it('keeps the previewed theme on enter', async () => {
    const frame = await opening([PICKED, BROWSED, { key: 'RETURN', leaves: 'themes' }]);

    expect(frame).not.toContain('themes');
    expect(frame).toContain(SECOND);
  });

  it('restores the kept theme on escape', async () => {
    const frame = await opening([PICKED, BROWSED, { key: 'ESCAPE', leaves: 'themes' }]);

    expect(frame).not.toContain(SECOND);
    expect(frame).toContain('kanagawa');
  });

  it('stays out of the way of a gate ceremony', async () => {
    const frame = await opening([{ key: 'a', lands: 'approve gate' }, 't']);

    expect(frame).toContain('approve gate');
    expect(frame).not.toContain('themes');
  });
});
