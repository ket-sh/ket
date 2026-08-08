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

function bottomRow(frame: string): string {
  const rows = frame.split('\n');

  return (rows.at(-1) === '' ? rows.at(-2) : rows.at(-1)) ?? '';
}

async function openedDocs(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  await landed((frame) => frame.includes('K-2'));
  pressed('d');

  return landed((seen) => seen.includes('board › docs'));
}

describe('the catalog rows the pointer works', () => {
  it('chooses the clicked row without opening the detail', async () => {
    const frame = await openedDocs();

    await clickedOn(frame, 'upgrade');

    const chosen = await landed((seen) => seen.includes('► upgrade'));

    expect(chosen).not.toContain('► handbook');
    expect(bottomRow(chosen)).toContain('⏎ detail');
  });

  it('opens the detail focus on a second click of the chosen row', async () => {
    const frame = await openedDocs();

    await clickedOn(frame, 'upgrade');

    const chosen = await landed((seen) => seen.includes('► upgrade'));

    await clickedOn(chosen, '► upgrade');

    const held = await landed((seen) => bottomRow(seen).includes('esc catalog'));

    expect(bottomRow(held)).toContain('esc catalog');
  });

  it('moves the selection with the wheel', async () => {
    const frame = await openedDocs();

    await scrolledOn(frame, '► handbook', 'down');

    const slid = await landed((seen) => seen.includes('► upgrade'));

    expect(slid).toContain('► upgrade');

    await scrolledOn(slid, '► upgrade', 'up');

    const back = await landed((seen) => seen.includes('► handbook'));

    expect(back).not.toContain('► upgrade');
  });
});
