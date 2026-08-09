import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

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
    const frame = await opening([
      ...OPENED,
      { key: 'TAB', lands: '║ designing' },
      { key: 'TAB', lands: 'A quiet fix' },
      { key: 'RETURN', lands: 'K-2 · journey' },
    ]);

    expect(frame).toContain('No description written.');
  });

  it('reads out the description the item was written with', async () => {
    const feed = feedOf();
    const opened = await testRender(
      <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
      { width: 160, height: 40 },
    );

    rendered = opened;
    await landed((seen) => seen.includes('K-2'));
    createMockKeys(opened.renderer).pressKey('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    createMockKeys(opened.renderer).pressKey('RETURN');

    const frame = await landed((seen) => seen.includes('K-1 · journey'));

    expect(frame).toContain('The keeper locks the account after five failures.');
    expect(frame).not.toContain('No description written.');
  });
});

describe('the workflow tab', () => {
  it('shows the stage canvas', async () => {
    const frame = await opening([...OPENED, { key: 'TAB', lands: '║ designing' }]);

    expect(frame).toContain('designing');
    expect(frame).toContain('awaiting-approval');
  });

  it('draws no artifact on the canvas, naming it once in the pane instead', async () => {
    const frame = await opening([...OPENED, { key: 'TAB', lands: '║ designing' }]);

    expect(frame).toContain('artifacts spec.md');
    expect(frame.split('spec.md')).toHaveLength(2);
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

const ON_ARTIFACTS: Press[] = [
  ...OPENED,
  { key: 'TAB', lands: '║ designing' },
  { key: 'TAB', lands: 'A quiet fix' },
  { key: 'TAB', lands: 'spec.md' },
];

function pressedTimes(key: string, times: number): void {
  if (rendered === undefined) {
    return;
  }

  const keys = createMockKeys(rendered.renderer);

  for (let held = 0; held < times; held += 1) {
    keys.pressKey(key);
  }
}

describe('the focus the artifacts tab hands around', () => {
  it('hands the tab row the focus at the top of the file list', async () => {
    const frame = await opening([...ON_ARTIFACTS, { key: 'ARROW_UP', lands: '▸ artifacts' }]);

    expect(frame).toContain('▸ artifacts');
  });

  it('walks the tabs with the arrows while the tab row holds focus', async () => {
    const frame = await opening([
      ...ON_ARTIFACTS,
      { key: 'ARROW_UP', lands: '▸ artifacts' },
      { key: 'ARROW_LEFT', lands: '▸ children' },
    ]);

    expect(frame).toContain('▸ children');
    expect(frame).toContain('A quiet fix');
  });

  it('drops the focus back into the panel on the way down', async () => {
    const frame = await opening([
      ...ON_ARTIFACTS,
      { key: 'ARROW_UP', lands: '▸ artifacts' },
      { key: 'ARROW_DOWN', leaves: '▸ artifacts' },
    ]);

    expect(frame).not.toContain('▸ artifacts');
    expect(frame).toContain('► spec.md');
  });
});

describe('the reading cursor inside the chosen doc', () => {
  it('walks the doc down with j once the content holds the focus', async () => {
    await opening([
      ...ON_ARTIFACTS,
      { key: 'ARROW_DOWN', lands: 'line 01' },
      { key: 'ARROW_RIGHT', lands: '▎' },
    ]);
    pressedTimes('j', 45);

    const frame = await landed((seen) => seen.includes('line 40'));

    expect(frame).toContain('line 40');
    expect(frame).not.toContain('line 01');
  });

  it('walks it back up with k', async () => {
    await opening([
      ...ON_ARTIFACTS,
      { key: 'ARROW_DOWN', lands: 'line 01' },
      { key: 'ARROW_RIGHT', lands: '▎' },
    ]);
    pressedTimes('j', 45);
    await landed((seen) => seen.includes('line 40'));
    pressedTimes('k', 45);

    const frame = await landed((seen) => seen.includes('line 01'));

    expect(frame).toContain('line 01');
  });

  it('hands the focus back to the file list on the way left', async () => {
    const frame = await opening([
      ...ON_ARTIFACTS,
      { key: 'ARROW_DOWN', lands: 'line 01' },
      { key: 'ARROW_RIGHT', lands: '▎' },
      { key: 'ARROW_LEFT', leaves: '▎' },
      { key: 'ARROW_UP', lands: 'Five failures lock the account.' },
    ]);

    expect(frame).toContain('Five failures lock the account.');
  });
});
