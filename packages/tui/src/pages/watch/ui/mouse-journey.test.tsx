import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const WIDE = 200;

const SNUG = 120;

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

function spotIn(frame: string, rowMark: string, text: string): { x: number; y: number } {
  const rows = frame.split('\n');
  const y = rows.findIndex((row) => row.includes(rowMark));
  const x = rows[y]?.indexOf(text) ?? -1;

  return { x, y };
}

async function clickedIn(frame: string, rowMark: string, text: string): Promise<void> {
  const spot = spotIn(frame, rowMark, text);

  await rendered?.mockMouse.click(spot.x, spot.y);
}

async function scrolledIn(
  frame: string,
  rowMark: string,
  text: string,
  direction: 'up' | 'down',
): Promise<void> {
  const spot = spotIn(frame, rowMark, text);

  await rendered?.mockMouse.scroll(spot.x, spot.y, direction);
}

function pressed(key: 'ARROW_RIGHT' | 'RETURN' | 'TAB'): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

async function landedOnJourney(width: number): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width, height: 40 },
  );
  await landed((frame) => frame.includes('K-2'));
  pressed('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  pressed('RETURN');

  return landed((seen) => seen.includes('K-1 · journey'));
}

async function landedOnWorkflow(width: number): Promise<string> {
  await landedOnJourney(width);
  pressed('TAB');

  return landed((seen) => seen.includes('║ designing'));
}

describe('the journey a pointer click steers', () => {
  it('switches the panel through a tab label click', async () => {
    const frame = await landedOnJourney(WIDE);

    await clickedIn(frame, ' overview ', 'children');

    expect(await landed((seen) => seen.includes('1 children'))).toContain('1 children');
  });

  it('chooses the stage under the click', async () => {
    const frame = await landedOnWorkflow(WIDE);

    await clickedIn(frame, 'triaged', 'triaged');

    const chosen = await landed((seen) => seen.includes('║ triaged'));

    expect(chosen).toContain('║ triaged');
    expect(chosen).not.toContain('║ designing');
  });

  it('dives into the children from the pane summary', async () => {
    const frame = await landedOnWorkflow(WIDE);

    await clickedIn(frame, 'children 0/1', 'children 0/1');

    expect(await landed((seen) => seen.includes('1 children'))).toContain('1 children');
  });
});

describe('the canvas the wheel walks', () => {
  it('walks the selection sideways where the canvas overflows', async () => {
    const frame = await landedOnWorkflow(SNUG);

    await scrolledIn(frame, '║ designing', 'designing', 'down');

    const walked = await landed((seen) => seen.includes('║ ‖ awaiting-approval'));

    await scrolledIn(walked, '║ ‖ awaiting-approval', 'awaiting-approval', 'up');

    expect(await landed((seen) => seen.includes('║ designing'))).toContain('║ designing');
  });

  it('keeps the selection still where the canvas fits', async () => {
    const frame = await landedOnWorkflow(WIDE);

    await scrolledIn(frame, '║ designing', 'designing', 'down');

    const rested = await settled();

    expect(rested).toContain('║ designing');
    expect(rested).not.toContain('║ ‖ awaiting-approval');
  });
});
