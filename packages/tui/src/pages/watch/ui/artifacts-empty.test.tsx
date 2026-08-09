import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

import type { BoardFeed } from '../../../shared/model';

import { WatchPage } from './index.tsx';
import { JOURNEY } from './journey-fixtures.ts';
import { feedOf, NOW } from './watch-fixtures.ts';

const PLACEHOLDER = 'No artifacts written yet.';

function bareFeedOf(): BoardFeed {
  return {
    ...feedOf(),
    journey: async (key) => {
      await Promise.resolve();

      return key === 'K-1' ? { ...JOURNEY, artifacts: [] } : undefined;
    },
  };
}

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

async function openedEmptyArtifacts(): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={bareFeedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  keys.pressKey('RETURN');
  await landed((seen) => seen.includes('K-1 · journey'));
  keys.pressKey('TAB');
  await landed((seen) => seen.includes('The keeper locks'));
  keys.pressKey('TAB');
  await landed((seen) => seen.includes('A quiet fix'));
  keys.pressKey('TAB');

  return landed((seen) => seen.includes(PLACEHOLDER));
}

describe('the artifacts tab of an item that wrote nothing', () => {
  it('says so once, seated at the panel edge, with no reading chrome', async () => {
    const frame = await openedEmptyArtifacts();
    const line = frame.split('\n').find((row) => row.includes(PLACEHOLDER)) ?? '';
    const seat = line.indexOf(PLACEHOLDER);
    const approach = line.slice(line.indexOf('│') + 1, seat);

    expect(seat).toBeLessThanOrEqual(6);
    expect(approach).not.toContain('│');
    expect(frame).not.toContain('▎');
  });
});
