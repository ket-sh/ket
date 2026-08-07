import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Key = 'ARROW_RIGHT' | 'ARROW_LEFT' | 'ARROW_UP' | 'ARROW_DOWN' | 'RETURN' | 'ESCAPE' | 'TAB';

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

async function opening(keys: Key[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await settled();

  while (!frame.includes('K-2')) {
    frame = await settled();
  }

  for (const key of keys) {
    createMockKeys(opened.renderer).pressKey(key);
    frame = await settled();
  }

  return frame;
}

describe('the surface a node opens', () => {
  it('opens the artifact doc full screen with its audience tabs', async () => {
    const frame = await opening(['ARROW_RIGHT', 'RETURN', 'ARROW_DOWN', 'RETURN']);

    expect(frame).toContain('K-1 · Spec');
    expect(frame).toContain('Technical');
    expect(frame).toContain('Five failures lock the account.');
  });

  it('switches the audience with tab', async () => {
    const frame = await opening(['ARROW_RIGHT', 'RETURN', 'ARROW_DOWN', 'RETURN', 'TAB']);

    expect(frame).toContain('Five tries and you wait.');
  });

  it('pops back to the journey on escape', async () => {
    const frame = await opening(['ARROW_RIGHT', 'RETURN', 'ARROW_DOWN', 'RETURN', 'ESCAPE']);

    expect(frame).toContain('K-1 · journey');
  });

  it('dives into a child journey and grows the path', async () => {
    const frame = await opening(['ARROW_RIGHT', 'RETURN', 'ARROW_UP', 'RETURN']);

    expect(frame).toContain('K-2 · journey');
    expect(frame).toContain('board › K-1 › K-2');
  });
});
