import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(20_000);

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

function rowWearing(frame: string, text: string): string {
  return frame.split('\n').find((row) => row.includes(text)) ?? '';
}

async function openedLog(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  await landed((frame) => frame.includes('K-2'));
  pressed('l');

  return landed((seen) => seen.includes('oplog · last 500'));
}

describe('the log rows the pointer works', () => {
  it('chooses the clicked row without opening it', async () => {
    const frame = await openedLog();

    await clickedOn(frame, 'no spec named');

    const chosen = await landed((seen) => rowWearing(seen, 'no spec named').includes('►'));

    expect(rowWearing(chosen, 'bun run lint')).not.toContain('►');
    expect(chosen).not.toContain('· journey');
  });

  it('dives on a second click of the chosen row', async () => {
    const frame = await openedLog();

    await clickedOn(frame, 'no spec named');

    const chosen = await landed((seen) => rowWearing(seen, 'no spec named').includes('►'));

    await clickedOn(chosen, 'no spec named');

    const dived = await landed((seen) => seen.includes('K-1 · journey'));

    expect(dived).toContain('board › oplog › K-1');
  });

  it('stays put on a second click of a row naming no item', async () => {
    const frame = await openedLog();

    await clickedOn(frame, 'bun run lint');

    const rested = await settled();

    expect(rested).toContain('oplog · last 500');
    expect(rested).not.toContain('· journey');
  });

  it('moves the selection with the wheel', async () => {
    const frame = await openedLog();

    await scrolledOn(frame, 'no spec named', 'down');

    const slid = await landed((seen) =>
      rowWearing(seen, 'researching the breakdown').includes('►'),
    );

    expect(rowWearing(slid, 'researching the breakdown')).toContain('►');

    await scrolledOn(slid, 'no spec named', 'up');

    const back = await landed((seen) => rowWearing(seen, 'bun run lint').includes('►'));

    expect(rowWearing(back, 'researching the breakdown')).not.toContain('►');
  });
});
