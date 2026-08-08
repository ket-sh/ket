import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

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

async function opening(presses: string[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const press of presses) {
    const before = frame;

    createMockKeys(opened.renderer).pressKey(press);
    frame = await landed((seen) => seen !== before);
  }

  return frame;
}

describe('the backlog behind the board', () => {
  it('names the key that opens it', async () => {
    expect(await opening([])).toContain('b backlog');
  });

  it('lists what nothing has started yet', async () => {
    const frame = await opening(['b']);

    expect(frame).toContain('backlog');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
  });

  it('leaves the item already in the active flow off the list', async () => {
    const frame = await opening(['b']);

    expect(frame).not.toContain('The watched item');
  });

  it('names the key that goes back to the board', async () => {
    expect(await opening(['b'])).toContain('b board');
  });

  it('gives the board back on a second press', async () => {
    const frame = await opening(['b', 'b']);

    expect(frame).toContain('The watched item');
    expect(frame).toContain('b backlog');
  });
});
