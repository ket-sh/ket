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

function pressed(key: string): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
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

async function narrowedTo(query: string, gone: string): Promise<string> {
  await openedBoard();
  pressed('/');
  await landed((seen) => seen.includes('⏎ keep'));
  typed(query);

  return landed((seen) => !seen.includes(gone));
}

describe('the filter bar the slash opens', () => {
  it('is advertised by the key bar before it ever opens', async () => {
    expect(bottomRow(await openedBoard())).toContain('/ filter');
  });

  it('opens on slash and never hides its way out', async () => {
    await openedBoard();
    pressed('/');

    const frame = await landed((seen) => seen.includes('⏎ keep'));

    expect(frame).toContain('⏎ keep');
    expect(frame).toContain('esc clear');
  });

  it('narrows the board live as the query grows', async () => {
    const frame = await narrowedTo('quiet', 'The watched item');

    expect(frame).toContain('A quiet fix');
    expect(frame).not.toContain('The watched item');
  });

  it('matches the key as well as the title', async () => {
    const frame = await narrowedTo('K-1', 'A quiet fix');

    expect(frame).toContain('The watched item');
    expect(frame).not.toContain('A quiet fix');
  });

  it('narrows by stage through the s sigil', async () => {
    const frame = await narrowedTo('s:designing', 'A quiet fix');

    expect(frame).toContain('The watched item');
    expect(frame).not.toContain('A quiet fix');
  });

  it('narrows by kind through the k sigil', async () => {
    const frame = await narrowedTo('k:bug', 'The watched item');

    expect(frame).toContain('A quiet fix');
    expect(frame).not.toContain('The watched item');
  });
});

describe('the way a narrowing ends or outlives the bar', () => {
  it('restores the whole board once escape closes it', async () => {
    await narrowedTo('quiet', 'The watched item');
    pressed('ESCAPE');

    const frame = await landed((seen) => seen.includes('The watched item'));

    expect(frame).toContain('A quiet fix');
    expect(frame).not.toContain('⏎ keep');
  });

  it('keeps the narrowing on enter and says so in the key bar', async () => {
    await narrowedTo('quiet', 'The watched item');
    pressed('RETURN');

    const frame = await landed((seen) => !seen.includes('⏎ keep'));

    expect(frame).not.toContain('The watched item');
    expect(bottomRow(frame)).toContain('/ quiet');
  });

  it('narrows the list view through the same slash', async () => {
    await openedBoard();
    pressed('v');
    await landed((seen) => seen.includes('v kanban'));
    pressed('/');
    await landed((seen) => seen.includes('⏎ keep'));
    typed('quiet');

    const frame = await landed((seen) => !seen.includes('The watched item'));

    expect(frame).toContain('A quiet fix');
  });

  it('leaves the backlog alone', async () => {
    await openedBoard();
    pressed('b');
    await landed((seen) => seen.includes('waiting'));
    await settled();
    pressed('/');

    const frame = await settled();

    expect(frame).not.toContain('⏎ keep');
    expect(bottomRow(frame)).not.toContain('/ filter');
  });
});
