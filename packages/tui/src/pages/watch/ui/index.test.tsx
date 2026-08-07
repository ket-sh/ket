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

async function openedAt(width: number, height: number): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width, height },
  );

  let frame = await settled();

  while (!frame.includes('K-2')) {
    frame = await settled();
  }

  return frame;
}

function pressed(key: 'ARROW_RIGHT' | 'ARROW_LEFT' | 'RETURN' | 'ESCAPE'): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

describe('the board the watch page shows', () => {
  it('seats every card under the column its status names', async () => {
    const frame = await openedAt(160, 30);

    expect(frame).toContain('triaged');
    expect(frame).toContain('designing');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain('K-1');
    expect(frame).toContain('The watched item');
  });

  it('shows how long a card has sat where it is', async () => {
    expect(await openedAt(160, 30)).toContain('2h');
  });

  it('wears the refusal that is still standing', async () => {
    expect(await openedAt(160, 30)).toContain('! the design names no spec');
  });

  it('hides an empty column, since dead lanes are noise', async () => {
    expect(await openedAt(160, 30)).not.toContain('awaiting-merge');
  });

  it('stacks the board as a list where a row of columns cannot fit', async () => {
    const frame = await openedAt(60, 40);

    expect(frame).toContain('K-1');
    expect(frame).toContain('K-2');
  });

  it('raises the banner and the live dot over the board', async () => {
    const frame = await openedAt(160, 30);

    expect(frame).toContain('▄▄█▄▄▄█▄▄');
    expect(frame).toContain('●');
  });
});

describe('the selection the arrows move', () => {
  it('starts on the first card and wears the double border', async () => {
    expect(await openedAt(160, 30)).toContain('║ K-2');
  });

  it('walks right into the next living column', async () => {
    await openedAt(160, 30);
    pressed('ARROW_RIGHT');

    const frame = await settled();

    expect(frame).toContain('║ K-1');
    expect(frame).not.toContain('║ K-2');
  });
});

async function landedOnJourney(): Promise<string> {
  await openedAt(160, 40);
  pressed('ARROW_RIGHT');
  await settled();
  pressed('RETURN');

  const started = Date.now();
  let frame = await settled();

  while (!frame.includes('K-1 · journey') && Date.now() - started < 5000) {
    frame = await settled();
  }

  return frame;
}

describe('the journey a card opens', () => {
  it('dives into the journey on enter and spells the path', async () => {
    const frame = await landedOnJourney();

    expect(frame).toContain('K-1 · journey');
    expect(frame).toContain('board › K-1');
    expect(frame).toContain('! no failing test covers it');
  });

  it('lands the selection on the active stage, never on an active child', async () => {
    expect(await landedOnJourney()).toContain('║ designing');
  });

  it('walks the canvas selection with the arrows', async () => {
    await landedOnJourney();
    pressed('ARROW_LEFT');

    const frame = await settled();

    expect(frame).toContain('║ triaged');
  });

  it('pops back to the board on escape', async () => {
    await landedOnJourney();
    pressed('ESCAPE');

    const frame = await settled();

    expect(frame).not.toContain('K-1 · journey');
    expect(frame).toContain('A quiet fix');
  });
});
