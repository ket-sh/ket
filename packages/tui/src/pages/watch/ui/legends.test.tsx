import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const ITEM_LEGEND_LEAD = 'K-1  feature · story';

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

async function openedJourney(): Promise<ReturnType<typeof createMockKeys>> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  keys.pressKey('RETURN');
  await landed((seen) => seen.includes('K-1 · journey'));

  return keys;
}

describe('the two legends of the journey screen', () => {
  it('keeps the item legend beside the overview tab', async () => {
    const keys = await openedJourney();

    keys.pressKey('TAB');

    const frame = await landed(
      (seen) => seen.includes('The keeper locks') && seen.includes(ITEM_LEGEND_LEAD),
    );

    expect(frame).toContain('The keeper locks the account after five failures.');
    expect(frame).toContain(ITEM_LEGEND_LEAD);
  });

  it('hands the stage legend the full width on f and takes it back', async () => {
    const keys = await openedJourney();
    const split = await landed((seen) => seen.includes(ITEM_LEGEND_LEAD));

    expect(split).toContain('f full');

    keys.pressKey('f');

    const wide = await landed((seen) => !seen.includes(ITEM_LEGEND_LEAD));

    expect(wide).not.toContain(ITEM_LEGEND_LEAD);
    expect(wide).toContain('║ designing');
    expect(wide).toContain('f split');

    keys.pressKey('f');

    const back = await landed((seen) => seen.includes(ITEM_LEGEND_LEAD));

    expect(back).toContain(ITEM_LEGEND_LEAD);
  });

  it('hands the item legend the full width once the pane holds the focus', async () => {
    const keys = await openedJourney();

    keys.pressKey('ARROW_RIGHT');
    await landed((seen) => seen.includes('→ item pane'));
    keys.pressKey('ARROW_RIGHT');
    await landed((seen) => seen.includes('▸ children'));
    keys.pressKey('f');

    const frame = await landed((seen) => !seen.includes('Not started'));

    expect(frame).not.toContain('Not started');
    expect(frame).toContain(ITEM_LEGEND_LEAD);
    expect(frame).toContain('f split');
  });
});
