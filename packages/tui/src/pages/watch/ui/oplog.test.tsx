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

function rowWearing(frame: string, text: string): string {
  return frame.split('\n').find((row) => row.includes(text)) ?? '';
}

function seatsOf(frame: string, texts: string[]): number[] {
  const rows = frame.split('\n');

  return texts.map((text) => rows.findIndex((row) => row.includes(text)));
}

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function openedLog(): Promise<string> {
  await openedBoard();
  pressed('l');

  return landed((seen) => seen.includes('oplog · last 500'));
}

describe('the screen the l key opens', () => {
  it('is advertised by the key bar and reached over the board', async () => {
    const board = await openedBoard();

    expect(bottomRow(board)).toContain('l log');

    const frame = await openedLog();

    expect(frame).toContain('oplog · last 500');
    expect(frame).toContain('board › oplog');
  });

  it('walks the rows newest first', async () => {
    const frame = await openedLog();
    const seated = seatsOf(frame, [
      'bun run lint',
      'researching the breakdown',
      'no spec named',
      'bun test',
    ]);

    expect(seated.every((row) => row > 0)).toBe(true);
    expect([...seated].sort((one, two) => one - two)).toStrictEqual(seated);
  });

  it('wears the age, gate, outcome, item, and text on one row', async () => {
    const frame = await openedLog();
    const row = rowWearing(frame, 'no spec named');

    expect(row).toContain('1h');
    expect(row).toContain('write');
    expect(row).toContain('refused');
    expect(row).toContain('K-1');
  });
});

describe('the walk the log answers', () => {
  it('chooses the newest row until the arrows walk the choice', async () => {
    const frame = await openedLog();

    expect(rowWearing(frame, 'bun run lint')).toContain('►');

    pressed('ARROW_DOWN');

    const walked = await landed((seen) =>
      rowWearing(seen, 'researching the breakdown').includes('►'),
    );

    expect(rowWearing(walked, 'bun run lint')).not.toContain('►');
  });

  it('dives to the journey of the item the chosen row names', async () => {
    await openedLog();
    pressed('ARROW_DOWN');
    pressed('ARROW_DOWN');

    const chosen = await landed((seen) => rowWearing(seen, 'no spec named').includes('►'));

    expect(chosen).toContain('► ');

    pressed('RETURN');

    const dived = await landed((seen) => seen.includes('K-1 · journey'));

    expect(dived).toContain('board › oplog › K-1');
  });

  it('stays put on enter while the chosen row names no item', async () => {
    await openedLog();
    pressed('RETURN');

    const frame = await settled();

    expect(frame).toContain('oplog · last 500');
    expect(frame).not.toContain('· journey');
  });

  it('walks back to the board on escape', async () => {
    await openedLog();
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes('oplog · last 500'));

    expect(frame).toContain('triaged 1');
  });
});

describe('the narrowing the slash opens on the log', () => {
  it('narrows the rows live as the query grows', async () => {
    await openedLog();
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('g:write');

    const frame = await landed((seen) => !seen.includes('bun run lint'));

    expect(frame).toContain('no spec named');
    expect(frame).not.toContain('researching the breakdown');
  });

  it('keeps the narrowing on enter and wears it in the key bar', async () => {
    await openedLog();
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('o:refused');
    pressed('RETURN');

    const frame = await landed((seen) => !seen.includes('⏎ keep'));

    expect(bottomRow(frame)).toContain('/ o:refused');
    expect(frame).not.toContain('bun test');
  });

  it('narrows by item through the i sigil', async () => {
    await openedLog();
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('i:k-2');

    const frame = await landed((seen) => !seen.includes('no spec named'));

    expect(frame).toContain('researching the breakdown');
  });

  it('leaves the board narrowing to the board', async () => {
    await openedBoard();
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('quiet');
    pressed('RETURN');
    await landed((seen) => !seen.includes('The watched item'));
    pressed('l');
    await landed((seen) => seen.includes('oplog · last 500'));
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('g:shell');
    pressed('RETURN');
    await landed((seen) => !seen.includes('no spec named'));
    pressed('ESCAPE');

    const board = await landed((seen) => !seen.includes('oplog · last 500'));

    expect(board).toContain('A quiet fix');
    expect(board).not.toContain('The watched item');
    expect(bottomRow(board)).toContain('/ quiet');
  });
});

describe('the other doors into the log', () => {
  it('lands from the palette', async () => {
    await openedBoard();
    pressed('p', { ctrl: true });
    await landed((seen) => seen.includes('► board'));
    typed('oplog');
    await landed((seen) => seen.includes('► oplog'));
    pressed('RETURN');

    const frame = await landed((seen) => seen.includes('oplog · last 500'));

    expect(frame).toContain('board › oplog');
  });

  it('names its keys in the help overlay', async () => {
    await openedLog();
    pressed('?');

    const frame = await landed((seen) => seen.includes('esc close'));

    expect(frame).toContain('⏎');
    expect(frame).toContain('journey');
  });
});
