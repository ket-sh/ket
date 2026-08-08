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

async function openedHelp(): Promise<string> {
  await openedBoard();
  pressed('?');

  return landed((seen) => seen.includes('esc close'));
}

describe('the help screen the question mark opens', () => {
  it('is advertised by the key bar', async () => {
    expect(bottomRow(await openedBoard())).toContain('? help');
  });

  it('groups every board binding under move, open, filter, and tools', async () => {
    const frame = await openedHelp();

    expect(frame).toContain('move');
    expect(frame).toContain('open');
    expect(frame).toContain('filter');
    expect(frame).toContain('tools');
    expect(frame).toContain('v        list');
    expect(frame).toContain('?        help');
    expect(frame).toContain('esc close');
  });

  it('lists the gate key the chosen card offers', async () => {
    const frame = await openedHelp();

    expect(frame).toContain('a        approve');
  });

  it('closes on escape and leaves the board as it stood', async () => {
    await openedHelp();
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes('esc close'));

    expect(frame).toContain('A quiet fix');
    expect(frame).not.toContain('v        list');
  });
});

describe('the help screen inside a journey', () => {
  it('lists the journey bindings, never the board ones', async () => {
    await openedBoard();
    pressed('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    pressed('RETURN');
    await landed((seen) => seen.includes('K-1 · journey'));
    pressed('?');

    const frame = await landed((seen) => seen.includes('esc close'));

    expect(frame).toContain('esc      board');
    expect(frame).not.toContain('v        list');
  });
});
