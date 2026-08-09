import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across one of them before a frame settles.
setDefaultTimeout(20_000);

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, idleFeedOf, NOW, STAGES } from './watch-fixtures.ts';

const WIDE = 200;

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

async function openedWith(feed: ActedFeed, width: number, height: number): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width, height },
  );

  return landed((frame) => frame.includes('K-2'));
}

async function openedAt(width: number, height: number): Promise<string> {
  return openedWith(feedOf(), width, height);
}

function rowWith(frame: string, text: string): string {
  return frame.split('\n').find((row) => row.includes(text)) ?? '';
}

function bottomRow(frame: string): string {
  const rows = frame.split('\n');

  return (rows.at(-1) === '' ? rows.at(-2) : rows.at(-1)) ?? '';
}

function pressed(key: 'ARROW_RIGHT' | 'ARROW_LEFT' | 'RETURN' | 'ESCAPE' | 'TAB'): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

describe('the board the watch page shows', () => {
  it('seats every card under the column its status names', async () => {
    const frame = await openedAt(WIDE, 30);

    expect(frame).toContain('triaged');
    expect(frame).toContain('designing');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain('K-1');
    expect(frame).toContain('The watched item');
  });

  it('shows how long a card has sat where it is', async () => {
    expect(await openedAt(WIDE, 30)).toContain('2h');
  });

  it('wears the refusal that is still standing', async () => {
    expect(await openedAt(WIDE, 30)).toContain('! no spec named');
  });

  it('gives every stage its own lane, even the ones no card has reached', async () => {
    const frame = await openedAt(WIDE, 30);

    for (const stage of STAGES) {
      expect(frame).toContain(` ${stage} `);
    }
  });

  it('keeps the lanes in a row where they outrun the screen', async () => {
    const frame = await openedAt(80, 24);

    expect(rowWith(frame, ' triaged ')).toContain('designing');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
  });

  it('follows the chosen card into a lane past the right edge', async () => {
    const feed = feedOf();

    await openedWith(feed, 80, 24);
    pressed('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    feed.shift('K-1', 'shipped');

    const frame = await landed((seen) => seen.includes('shipped 1'));

    expect(frame).toContain('║ K-1');
  });

  it('raises the banner and the live dot over the board', async () => {
    const frame = await openedAt(WIDE, 30);

    expect(frame).toContain('▄▄█▄▄▄█▄▄');
    expect(frame).toContain('●');
  });

  it('keeps one quiet line between the banner and the breadcrumb', async () => {
    const rows = (await openedAt(WIDE, 30)).split('\n');
    const bannerFoot = rows.findIndex((row) => row.includes('█   █'));
    const header = rows.findIndex((row) => row.includes('● board'));

    expect(rows[bannerFoot + 1]?.trim()).toBe('');
    expect(header).toBe(bannerFoot + 2);
  });
});

describe('the selection the arrows move', () => {
  it('starts on the first card and wears the double border', async () => {
    expect(await openedAt(WIDE, 30)).toContain('║ K-2');
  });

  it('walks right into the next lane that holds a card', async () => {
    await openedAt(WIDE, 30);
    pressed('ARROW_RIGHT');

    const frame = await landed((seen) => seen.includes('║ K-1'));

    expect(frame).toContain('║ K-1');
    expect(frame).not.toContain('║ K-2');
  });

  it('follows the pipeline onward when the selected lane empties underneath', async () => {
    const feed = feedOf();

    await openedWith(feed, WIDE, 30);
    pressed('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    feed.shift('K-1', 'awaiting-approval');

    const frame = await landed((seen) => seen.includes('awaiting-approval 1'));

    expect(frame).toContain('║ K-1');
  });

  it('holds the selection on a card when no lane beyond it holds one', async () => {
    await openedAt(WIDE, 30);
    pressed('ARROW_RIGHT');
    await landed((seen) => seen.includes('║ K-1'));
    pressed('ARROW_RIGHT');

    expect(await settled()).toContain('║ K-1');
  });
});

async function landedOnJourney(): Promise<string> {
  await openedAt(WIDE, 40);
  pressed('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  pressed('RETURN');

  return landed((seen) => seen.includes('K-1 · journey'));
}

async function landedOnWorkflow(): Promise<string> {
  await landedOnJourney();
  pressed('TAB');

  return landed((seen) => seen.includes('║ designing'));
}

describe('the journey a card opens', () => {
  it('dives into the journey on enter and spells the path', async () => {
    const frame = await landedOnJourney();

    expect(frame).toContain('K-1 · journey');
    expect(frame).toContain('board › K-1');
    expect(frame).toContain('! no failing test covers it');
  });

  it('lands the selection on the active stage once the workflow opens', async () => {
    expect(await landedOnWorkflow()).toContain('║ designing');
  });

  it('walks the canvas selection with the arrows', async () => {
    await landedOnWorkflow();
    pressed('ARROW_LEFT');

    const frame = await landed((seen) => seen.includes('║ triaged'));

    expect(frame).toContain('║ triaged');
  });

  it('pops back to the board on escape', async () => {
    await landedOnJourney();
    pressed('ESCAPE');

    const frame = await landed((seen) => !seen.includes('K-1 · journey'));

    expect(frame).not.toContain('K-1 · journey');
    expect(frame).toContain('A quiet fix');
  });
});

describe('the key bar the chrome carries', () => {
  it('spells the keys along the bottom row of the screen', async () => {
    const frame = await openedAt(WIDE, 30);

    expect(bottomRow(frame)).toContain('q quit');
  });

  it('keeps its row clear of lanes that overrun the screen', async () => {
    const frame = await openedAt(80, 24);

    expect(bottomRow(frame)).toContain('q quit');
  });

  it('drops the hint it can best spare rather than the way out', async () => {
    const narrow = bottomRow(await openedAt(80, 24));

    expect(narrow).toContain('q quit');
    expect(narrow).not.toContain('r refresh');
  });

  it('spells every key once the row has the room for them', async () => {
    const wide = bottomRow(await openedAt(WIDE, 30));

    expect(wide).toContain('r refresh');
    expect(wide).toContain('b backlog');
  });

  it('leaves the header to the breadcrumb alone', async () => {
    const frame = await openedAt(WIDE, 30);

    expect(rowWith(frame, '● board')).not.toContain('q quit');
    expect(rowWith(frame, '● board')).not.toContain('kanagawa');
  });

  it('names the keys the view under it answers', async () => {
    const frame = await landedOnJourney();

    expect(bottomRow(frame)).toContain('esc board');
  });

  it('hides the hints that act on nothing while the board holds no card', async () => {
    rendered = await testRender(
      <WatchPage feed={idleFeedOf()} clock={() => NOW} onQuit={() => undefined} />,
      { width: WIDE, height: 30 },
    );

    const frame = await landed((seen) => seen.includes('triaged 0'));
    const bar = bottomRow(frame);

    expect(bar).toContain('q quit');
    expect(bar).toContain('m map');
    expect(bar).not.toContain('move');
    expect(bar).not.toContain('journey');
    expect(bar).not.toContain('/ filter');
  });
});
