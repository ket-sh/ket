import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Key = 'ARROW_RIGHT' | 'ARROW_LEFT' | 'ARROW_UP' | 'ARROW_DOWN' | 'RETURN' | 'ESCAPE' | 'TAB';

type Press = Key | { key: Key; lands: string };

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

async function landed(marker: string | undefined): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (marker !== undefined && !frame.includes(marker) && Date.now() - started < 5000) {
    frame = await settled();
  }

  return frame;
}

async function opening(presses: Press[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed('K-2');

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(typeof press === 'string' ? press : press.key);
    frame = await landed(typeof press === 'string' ? undefined : press.lands);
  }

  return frame;
}

const SPEC_PATH: Press[] = [
  'ARROW_RIGHT',
  { key: 'RETURN', lands: 'K-1 · journey' },
  'ARROW_DOWN',
  { key: 'RETURN', lands: 'K-1 · Spec' },
];

describe('the surface a node opens', () => {
  it('opens the artifact doc full screen with its audience tabs', async () => {
    const frame = await opening(SPEC_PATH);

    expect(frame).toContain('K-1 · Spec');
    expect(frame).toContain('Technical');
    expect(frame).toContain('Five failures lock the account.');
  });

  it('switches the audience with tab', async () => {
    const frame = await opening([...SPEC_PATH, { key: 'TAB', lands: 'Five tries' }]);

    expect(frame).toContain('Five tries and you wait.');
  });

  it('pops back to the journey on escape', async () => {
    const frame = await opening([...SPEC_PATH, { key: 'ESCAPE', lands: 'K-1 · journey' }]);

    expect(frame).toContain('K-1 · journey');
  });

  it('dives into a child journey and grows the path', async () => {
    const frame = await opening([
      'ARROW_RIGHT',
      { key: 'RETURN', lands: 'K-1 · journey' },
      'ARROW_UP',
      { key: 'RETURN', lands: 'K-2 · journey' },
    ]);

    expect(frame).toContain('K-2 · journey');
    expect(frame).toContain('board › K-1 › K-2');
  });
});
