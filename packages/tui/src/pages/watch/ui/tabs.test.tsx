import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Key = 'ARROW_RIGHT' | 'ARROW_LEFT' | 'ARROW_UP' | 'ARROW_DOWN' | 'RETURN' | 'ESCAPE' | 'TAB';

type Press = Key | { key: Key; lands?: string; leaves?: string };

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

function settledDown(press: Press): (frame: string) => boolean {
  if (typeof press === 'string') {
    return () => true;
  }

  return (frame) =>
    (press.lands === undefined || frame.includes(press.lands)) &&
    (press.leaves === undefined || !frame.includes(press.leaves));
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 15_000) {
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

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(typeof press === 'string' ? press : press.key);
    frame = await landed(settledDown(press));
  }

  return frame;
}

const OPENED: Press[] = [
  { key: 'ARROW_RIGHT', lands: '║ K-1' },
  { key: 'RETURN', lands: 'K-1 · journey' },
];

describe('the tabs an opened item wears', () => {
  it('names every tab across the top', async () => {
    const frame = await opening(OPENED);

    expect(frame).toContain('overview');
    expect(frame).toContain('workflow');
    expect(frame).toContain('children');
    expect(frame).toContain('artifacts');
  });

  it('lands on the overview carrying the item title', async () => {
    const frame = await opening(OPENED);

    expect(frame).toContain('The watched item');
  });

  it('says so when the item carries no description', async () => {
    const frame = await opening(OPENED);

    expect(frame).toContain('No description written.');
  });
});

describe('the workflow tab', () => {
  it('shows the stage canvas and no artifact box', async () => {
    const frame = await opening([...OPENED, { key: 'TAB', lands: '║ designing' }]);

    expect(frame).toContain('designing');
    expect(frame).toContain('awaiting-approval');
    expect(frame).not.toContain('spec.md');
  });
});

describe('the children tab', () => {
  it('lists a child row with the state the board would show', async () => {
    const frame = await opening([
      ...OPENED,
      { key: 'TAB', lands: '║ designing' },
      { key: 'TAB', lands: 'A quiet fix' },
    ]);

    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain('subtask');
  });

  it('drills into the child journey on enter', async () => {
    const frame = await opening([
      ...OPENED,
      { key: 'TAB', lands: '║ designing' },
      { key: 'TAB', lands: 'A quiet fix' },
      { key: 'RETURN', lands: 'K-2 · journey' },
    ]);

    expect(frame).toContain('board › K-1 › K-2');
  });
});

describe('the artifacts tab', () => {
  it('lists the artifacts the item wrote beside the chosen one', async () => {
    const frame = await opening([
      ...OPENED,
      { key: 'TAB', lands: '║ designing' },
      { key: 'TAB', lands: 'A quiet fix' },
      { key: 'TAB', lands: 'spec.md' },
    ]);

    expect(frame).toContain('spec.md');
    expect(frame).toContain('Five failures lock the account.');
  });
});
