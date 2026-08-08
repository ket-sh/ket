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

async function openedBoard(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: WIDE, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function openedDocs(): Promise<string> {
  await openedBoard();
  pressed('d');

  return landed((seen) => seen.includes('board › docs'));
}

describe('the screen the d key opens', () => {
  it('is advertised by the key bar and reached over the board', async () => {
    const board = await openedBoard();

    expect(bottomRow(board)).toContain('d docs');

    const frame = await openedDocs();

    expect(frame).toContain('board › docs');
    expect(bottomRow(frame)).toContain('⏎ detail');
  });

  it('shelves the catalog under its group headings', async () => {
    const frame = await openedDocs();

    expect(frame).toContain('reference');
    expect(frame).toContain('adr');
    expect(frame).toContain('architecture');
    expect(frame).toContain('handbook');
    expect(frame).toContain('0001-first-call');
    expect(frame).toContain('cli shared');
  });

  it('wears the rot state on the row and stays quiet on the fresh', async () => {
    const frame = await openedDocs();

    expect(rowWearing(frame, 'upgrade')).toContain('stale');
    expect(rowWearing(frame, 'why')).toContain('unpinned');
    expect(rowWearing(frame, 'mangled')).toContain('broken');
    expect(rowWearing(frame, 'handbook')).not.toContain('stale');
  });
});

describe('the walk the catalog answers', () => {
  it('chooses the first row until the arrows walk the choice', async () => {
    const frame = await openedDocs();

    expect(frame).toContain('► handbook');

    pressed('ARROW_DOWN');

    const walked = await landed((seen) => seen.includes('► upgrade'));

    expect(walked).not.toContain('► handbook');
  });

  it('shows the chosen row in the detail pane', async () => {
    const frame = await openedDocs();

    expect(frame).toContain('category  reference');
    expect(frame).toContain('docs: rewrite the tour (#70)');

    for (let step = 0; step < 5; step += 1) {
      pressed('ARROW_DOWN');
    }

    const drawn = await landed((seen) => seen.includes('depends on'));

    expect(drawn).toContain('tui root');
    expect(drawn).toContain('Commands are islands');
  });

  it('opens the detail focus on enter and hands escape back to the catalog', async () => {
    await openedDocs();
    pressed('RETURN');

    const held = await landed((seen) => bottomRow(seen).includes('esc catalog'));

    expect(bottomRow(held)).toContain('esc catalog');

    pressed('ESCAPE');

    const rested = await landed((seen) => bottomRow(seen).includes('⏎ detail'));

    expect(rested).toContain('board › docs');
  });

  it('walks back to the board on escape', async () => {
    await openedDocs();
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes('board › docs'));

    expect(frame).toContain('triaged 1');
  });
});

describe('the other doors into the docs screen', () => {
  it('lands from the palette', async () => {
    await openedBoard();
    pressed('p', { ctrl: true });
    await landed((seen) => seen.includes('► board'));
    typed('docs');
    await landed((seen) => seen.includes('► docs'));
    pressed('RETURN');

    const frame = await landed((seen) => seen.includes('board › docs'));

    expect(frame).toContain('handbook');
  });

  it('names its keys in the help overlay', async () => {
    await openedDocs();
    pressed('?');

    const frame = await landed((seen) => seen.includes('esc close'));

    expect(frame).toContain('⏎');
    expect(frame).toContain('detail');
  });
});
