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

async function opened(): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 200, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function onWorkflow(): Promise<string> {
  await opened();

  if (rendered === undefined) {
    throw new Error('the page never rendered');
  }

  const keys = createMockKeys(rendered.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((frame) => frame.includes('║ K-1'));
  keys.pressKey('RETURN');
  await landed((frame) => frame.includes('K-1 · journey'));

  return landed((frame) => frame.includes('Not started'));
}

describe('the narration the board card carries', () => {
  it('shows the freshest note on the card, under the title', async () => {
    expect(await opened()).toContain('researching');
  });
});

describe('the narration the journey page carries', () => {
  it('says what is happening under the running stage', async () => {
    expect(await onWorkflow()).toContain('researching the break');
  });

  it('attributes the narration in the item pane', async () => {
    expect(await onWorkflow()).toContain('by decomposer');
  });
});
