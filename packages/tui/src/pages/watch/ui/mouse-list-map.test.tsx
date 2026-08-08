import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const WIDE = 200;

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

function spotOn(frame: string, text: string): { x: number; y: number } {
  const rows = frame.split('\n');
  const y = rows.findIndex((row) => row.includes(text));
  const x = rows[y]?.indexOf(text) ?? -1;

  return { x, y };
}

async function clickedOn(frame: string, text: string): Promise<void> {
  const spot = spotOn(frame, text);

  await rendered?.mockMouse.click(spot.x, spot.y);
}

async function scrolledOn(frame: string, text: string, direction: 'up' | 'down'): Promise<void> {
  const spot = spotOn(frame, text);

  await rendered?.mockMouse.scroll(spot.x, spot.y, direction);
}

function pressed(key: string): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function openedList(): Promise<string> {
  await openedBoard();
  pressed('v');

  return landed((seen) => seen.includes('► K-2'));
}

async function openedMap(): Promise<string> {
  await openedBoard();
  pressed('m');

  return landed((seen) => seen.includes('see the shelves · walking skeleton'));
}

describe('the list the pointer works', () => {
  it('chooses the clicked row', async () => {
    const frame = await openedList();

    await clickedOn(frame, 'The watched item');

    const chosen = await landed((seen) => seen.includes('► K-1'));

    expect(chosen).toContain('► K-1');
    expect(chosen).not.toContain('► K-2');
    expect(chosen).not.toContain('· journey');
  });

  it('moves the selection with the wheel', async () => {
    const frame = await openedList();

    await scrolledOn(frame, 'A quiet fix', 'down');

    const slid = await landed((seen) => seen.includes('► K-1'));

    await scrolledOn(slid, 'A quiet fix', 'up');

    expect(await landed((seen) => seen.includes('► K-2'))).toContain('► K-2');
  });
});

describe('the map the pointer works', () => {
  it('chooses the clicked node', async () => {
    const frame = await openedMap();

    await clickedOn(frame, 'pay by card');

    const chosen = await landed((seen) => seen.includes('pay by card · walking skeleton'));

    expect(chosen).toContain('pay by card · walking skeleton');
  });

  it('moves the selection with the wheel', async () => {
    const frame = await openedMap();

    await scrolledOn(frame, 'see the shelves', 'down');

    const walked = await landed((seen) => seen.includes('pay by card · walking skeleton'));

    await scrolledOn(walked, 'pay by card', 'up');

    expect(await landed((seen) => seen.includes('see the shelves · walking skeleton'))).toContain(
      'see the shelves · walking skeleton',
    );
  });
});
