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

async function clickedOn(frame: string, text: string): Promise<void> {
  const rows = frame.split('\n');
  const y = rows.findIndex((row) => row.includes(text));
  const x = rows[y]?.indexOf(text) ?? -1;

  await rendered?.mockMouse.click(x, y);
}

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

describe('the seat a pointer click moves', () => {
  it('chooses the card under the click without opening it', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'The watched item');

    const chosen = await landed((seen) => seen.includes('║ K-1'));

    expect(chosen).toContain('║ K-1');
    expect(chosen).not.toContain('║ K-2');
    expect(chosen).not.toContain('· journey');
  });

  it('opens the journey on a second click on the chosen card', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'The watched item');

    const chosen = await landed((seen) => seen.includes('║ K-1'));

    await clickedOn(chosen, 'The watched item');

    expect(await landed((seen) => seen.includes('K-1 · journey'))).toContain('board › K-1');
  });

  it('opens the journey on one click on the card already chosen', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'A quiet fix');

    expect(await landed((seen) => seen.includes('K-2 · journey'))).toContain('board › K-2');
  });

  it('moves the seat to the head of the lane whose header is clicked', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'designing 1');

    const moved = await landed((seen) => seen.includes('║ K-1'));

    expect(moved).toContain('║ K-1');
    expect(moved).not.toContain('· journey');
  });
});

describe('the key bar a pointer click presses', () => {
  it('toggles the backlog through the b hint, there and back', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'b backlog');

    const queued = await landed((seen) => seen.includes(' waiting '));

    await clickedOn(queued, 'b board');

    const back = await landed((seen) => !seen.includes(' waiting '));

    expect(back).toContain('║ K-2');
  });

  it('swaps to the list through the v hint', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, 'v list');

    const listed = await landed((seen) => seen.includes('v kanban'));
    const row = listed.split('\n').find((one) => one.includes('K-2')) ?? '';

    expect(row).toContain('A quiet fix');
  });

  it('does nothing where the hint names no single key', async () => {
    const frame = await openedBoard();

    await clickedOn(frame, '←↑↓→ move');

    const rested = await settled();

    expect(rested).toContain('║ K-2');
    expect(rested).not.toContain('· journey');
  });
});
