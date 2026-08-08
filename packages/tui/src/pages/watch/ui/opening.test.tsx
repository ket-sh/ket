import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(20_000);

import type { WatchView } from '../model/opening.ts';

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

function pressed(key: string): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

interface Opened {
  opening?: WatchView;
  remember?: (view: WatchView) => void;
  onQuit?: () => void;
}

async function openedWith(
  { opening, remember, onQuit }: Opened,
  until: (frame: string) => boolean,
): Promise<string> {
  rendered = await testRender(
    <WatchPage
      feed={feedOf()}
      clock={() => NOW}
      onQuit={onQuit ?? ((): undefined => undefined)}
      opening={opening}
      remember={remember}
    />,
    { width: 160, height: 40 },
  );

  return landed(until);
}

describe('the frame a deep link opens on', () => {
  it('opens straight onto the addressed journey with the board behind it', async () => {
    const frame = await openedWith(
      { opening: { stage: { kind: 'journey', key: 'K-1', tab: 'overview' } } },
      (seen) => seen.includes('K-1 · journey'),
    );

    expect(frame).toContain('K-1 · journey');
    expect(frame).toContain('board › K-1');
  });

  it('lands on the addressed tab', async () => {
    const frame = await openedWith(
      { opening: { stage: { kind: 'journey', key: 'K-1', tab: 'children' } } },
      (seen) => seen.includes('○ K-2'),
    );

    expect(frame).toContain('○ K-2');
  });

  it('pops back to the board on escape as if walked into', async () => {
    await openedWith(
      { opening: { stage: { kind: 'journey', key: 'K-1', tab: 'overview' } } },
      (seen) => seen.includes('K-1 · journey'),
    );
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes('K-1 · journey'));

    expect(frame).toContain('triaged 1');
  });
});

describe('the memory a reopening honors', () => {
  it('reopens the remembered list layout', async () => {
    const frame = await openedWith({ opening: { layout: 'list' } }, (seen) =>
      seen.includes('v kanban'),
    );

    expect(frame).toContain('v kanban');
  });

  it('reopens the remembered story map', async () => {
    const frame = await openedWith({ opening: { stage: { kind: 'map' } } }, (seen) =>
      seen.includes('walking skeleton'),
    );

    expect(frame).toContain('walking skeleton');
  });

  it('reopens the remembered operation log', async () => {
    const frame = await openedWith({ opening: { stage: { kind: 'oplog' } } }, (seen) =>
      seen.includes('oplog · last 500'),
    );

    expect(frame).toContain('oplog · last 500');
    expect(frame).toContain('board › oplog');
  });

  it('seats the remembered chosen card', async () => {
    const frame = await openedWith({ opening: { chosen: 'K-1' } }, (seen) =>
      seen.includes('║ K-1'),
    );

    expect(frame).toContain('║ K-1');
    expect(frame).not.toContain('║ K-2');
  });
});

describe('the standing watch reports to be remembered', () => {
  it('reports the journey once a dive lands there', async () => {
    const reported: WatchView[] = [];

    const remember = (view: WatchView): void => {
      reported.push(view);
    };

    await openedWith({ remember }, (seen) => seen.includes('K-2'));
    pressed('RETURN');
    await landed((seen) => seen.includes('K-2 · journey'));

    expect(reported.at(-1)).toStrictEqual({
      layout: 'kanban',
      chosen: 'K-2',
      stage: { kind: 'journey', key: 'K-2', tab: 'overview' },
    });
  });

  it('reports the operation log once the l key lands there', async () => {
    const reported: WatchView[] = [];

    const remember = (view: WatchView): void => {
      reported.push(view);
    };

    await openedWith({ remember }, (seen) => seen.includes('K-2'));
    pressed('l');
    await landed((seen) => seen.includes('oplog · last 500'));

    expect(reported.at(-1)).toStrictEqual({
      layout: 'kanban',
      chosen: 'K-2',
      stage: { kind: 'oplog' },
    });
  });

  it('reports the standing before quit lets go', async () => {
    const reported: WatchView[] = [];
    let atQuit: WatchView | undefined;

    await openedWith(
      {
        remember: (view) => {
          reported.push(view);
        },
        onQuit: () => {
          atQuit = reported.at(-1);
        },
      },
      (seen) => seen.includes('K-2'),
    );
    pressed('q');
    await landed(() => atQuit !== undefined);

    expect(atQuit).toStrictEqual({ layout: 'kanban', chosen: 'K-2' });
  });
});
