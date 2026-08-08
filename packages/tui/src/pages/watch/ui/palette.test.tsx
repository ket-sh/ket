import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const WIDE = 200;

const WAY_OUT = '⏎ go · esc close';

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

function bottomRow(frame: string): string {
  const rows = frame.split('\n');

  return (rows.at(-1) === '' ? rows.at(-2) : rows.at(-1)) ?? '';
}

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function openedPalette(): Promise<string> {
  await openedBoard();
  pressed('p', { ctrl: true });

  return landed((seen) => seen.includes(WAY_OUT));
}

describe('the palette ctrl+p raises', () => {
  it('is advertised by the key bar', async () => {
    expect(bottomRow(await openedBoard())).toContain('ctrl+p go');
  });

  it('lists the screens and the items, way out always in sight', async () => {
    const frame = await openedPalette();

    expect(frame).toContain('► board');
    expect(frame).toContain('backlog');
    expect(frame).toContain('map');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain(WAY_OUT);
  });

  it('walks the rows with the arrows', async () => {
    await openedPalette();
    pressed('ARROW_DOWN');

    const frame = await landed((seen) => seen.includes('► list'));

    expect(frame).toContain('► list');
    expect(frame).not.toContain('► board');
  });

  it('closes on escape without going anywhere', async () => {
    await openedPalette();
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes(WAY_OUT));

    expect(frame).toContain('A quiet fix');
    expect(frame).not.toContain(' · journey');
  });

  it('keeps its way out in sight even when nothing matches', async () => {
    await openedPalette();
    typed('zzzz');

    const frame = await landed((seen) => seen.includes('zzzz'));

    expect(frame).toContain(WAY_OUT);
  });
});

describe('where the palette goes on enter', () => {
  it('dives into the item the query threads to', async () => {
    await openedPalette();
    typed('quiet');
    await landed((seen) => seen.includes('► K-2'));
    pressed('RETURN');

    await landed((seen) => seen.includes('K-2 · journey'));

    const frame = await settled();

    expect(frame).toContain('board › K-2');
  });

  it('lands on a screen destination', async () => {
    await openedPalette();
    typed('backlog');
    await landed((seen) => seen.includes('► backlog'));
    pressed('RETURN');

    const frame = await landed((seen) => seen.includes('waiting'));

    expect(frame).toContain('backlog · ');
  });

  it('opens the gate the seat offers', async () => {
    await openedPalette();
    typed('approve');
    await landed((seen) => seen.includes('► approve K-2'));
    pressed('RETURN');

    const frame = await landed((seen) => seen.includes('approve gate'));

    expect(frame).toContain('approve gate');
  });

  it('reaches an item from inside a journey, through the board', async () => {
    await openedBoard();
    pressed('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    pressed('RETURN');
    await landed((seen) => seen.includes('K-1 · journey'));
    pressed('p', { ctrl: true });
    await landed((seen) => seen.includes(WAY_OUT));
    typed('k-2');
    await landed((seen) => seen.includes('► K-2'));
    pressed('RETURN');

    const frame = await landed((seen) => seen.includes('K-2 · journey'));

    expect(frame).toContain('board › K-2');
    expect(frame).not.toContain('K-1 · journey');
  });
});
