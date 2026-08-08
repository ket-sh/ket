import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Press = { key: string; lands: string } | { key: string; gone: string };

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

  while (!done(frame) && Date.now() - started < 2_000) {
    frame = await settled();
  }

  return frame;
}

function settledDown(press: Press): (frame: string) => boolean {
  return (frame) => ('lands' in press ? frame.includes(press.lands) : !frame.includes(press.gone));
}

async function opening(presses: Press[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(press.key);
    frame = await landed(settledDown(press));
  }

  return frame;
}

const OPENED: Press = { key: 'm', lands: 'buy a thing' };

const LEFT: Press = { key: 'ESCAPE', gone: 'buy a thing' };

describe('the story map the board opens', () => {
  it('lays the map over the board on m', async () => {
    const frame = await opening([OPENED]);

    expect(frame).toContain('buy a thing');
    expect(frame).toContain('browse the catalog');
    expect(frame).toContain('walking skeleton');
  });

  it('seats the selection on the first card of the map it opened', async () => {
    expect(await opening([OPENED])).toContain('║ see the shelves');
  });

  it('says how to get back out along the top', async () => {
    expect(await opening([OPENED])).toContain('esc board');
  });

  it('walks the map selection card by card while the map is up', async () => {
    const frame = await opening([OPENED, { key: 'ARROW_RIGHT', lands: '║ pay by card' }]);

    expect(frame).toContain('pay by card · walking skeleton');
    expect(frame).not.toContain('║ see the shelves');
  });

  it('returns to the board on escape', async () => {
    const frame = await opening([OPENED, LEFT]);

    expect(frame).not.toContain('buy a thing');
    expect(frame).toContain('A quiet fix');
  });
});
