import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { THEMES } from '../../../shared/theme';
import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const WIDE = 200;

const WAY_OUT = '⏎ go · esc close';

const SECOND = THEMES[1]?.[0] ?? '';

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

function pressed(key: string, modifiers?: { ctrl?: boolean }): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key, modifiers);
  }
}

function typed(text: string): void {
  for (const glyph of text) {
    pressed(glyph);
  }
}

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

describe('the palette the pointer works', () => {
  it('acts a clicked row like choosing it and pressing enter', async () => {
    await openedBoard();
    pressed('p', { ctrl: true });

    const opened = await landed((seen) => seen.includes(WAY_OUT));

    await clickedOn(opened, 'backlog');

    expect(await landed((seen) => seen.includes(' waiting '))).not.toContain(WAY_OUT);
  });

  it('closes on a click outside without moving the seat', async () => {
    await openedBoard();
    pressed('p', { ctrl: true });

    const opened = await landed((seen) => seen.includes(WAY_OUT));

    await clickedOn(opened, 'The watched item');

    const shut = await landed((seen) => !seen.includes(WAY_OUT));

    expect(shut).toContain('║ K-2');
    expect(shut).not.toContain('║ K-1');
    expect(shut).not.toContain('· journey');
  });
});

describe('the help overlay the pointer shuts', () => {
  it('closes on a click outside without moving the seat', async () => {
    await openedBoard();
    pressed('?');

    const opened = await landed((seen) => seen.includes(' keys '));

    await clickedOn(opened, 'The watched item');

    const shut = await landed((seen) => !seen.includes(' keys '));

    expect(shut).toContain('║ K-2');
    expect(shut).not.toContain('║ K-1');
  });
});

describe('the backlog the pointer works', () => {
  it('opens the journey of a clicked row', async () => {
    await openedBoard();
    pressed('b');

    const queued = await landed((seen) => seen.includes(' waiting '));

    await clickedOn(queued, 'A quiet fix');

    expect(await landed((seen) => seen.includes('K-2 · journey'))).toContain('board › K-2');
  });

  it('closes on a click outside the box', async () => {
    await openedBoard();
    pressed('b');
    await landed((seen) => seen.includes(' waiting '));
    await rendered?.mockMouse.click(0, 0);

    expect(await landed((seen) => !seen.includes(' waiting '))).toContain('║ K-2');
  });
});

describe('the filter a click outside clears', () => {
  it('drops the query and keeps the seat like escape', async () => {
    await openedBoard();
    pressed('/');
    await landed((seen) => seen.includes('esc clear'));
    typed('quiet');

    const narrowed = await landed((seen) => !seen.includes('The watched item'));

    await clickedOn(narrowed, 'A quiet fix');

    const cleared = await landed((seen) => seen.includes('The watched item'));

    expect(cleared).not.toContain('esc clear');
    expect(cleared).toContain('║ K-2');
    expect(cleared).not.toContain('· journey');
  });
});

describe('the theme picker the pointer works', () => {
  it('keeps the theme whose row is clicked', async () => {
    await openedBoard();
    pressed('t');

    const opened = await landed((seen) => seen.includes('themes'));

    await clickedOn(opened, SECOND);
    await landed((seen) => !seen.includes('themes'));
    pressed('t');

    const reopened = await landed((seen) => seen.includes('themes'));

    expect(reopened).toContain(`► ${SECOND}`);
  });

  it('reverts the preview on a click outside', async () => {
    await openedBoard();
    pressed('t');
    await landed((seen) => seen.includes('themes'));
    pressed('ARROW_DOWN');

    const previewed = await landed((seen) => seen.includes(`► ${SECOND}`));

    await clickedOn(previewed, 'The watched item');

    const shut = await landed((seen) => !seen.includes('themes'));

    expect(shut).not.toContain('║ K-1');

    pressed('t');

    const reopened = await landed((seen) => seen.includes('themes'));

    expect(reopened).toContain('► kanagawa');
    expect(reopened).not.toContain(`► ${SECOND}`);
  });
});

describe('the board under a gate ceremony', () => {
  it('stays inert under the modal', async () => {
    await openedBoard();
    pressed('a');

    const asked = await landed((seen) => seen.includes('approve gate'));

    await clickedOn(asked, 'The watched item');

    const held = await settled();

    expect(held).toContain('approve gate');
    expect(held).not.toContain('║ K-1');
  });
});
