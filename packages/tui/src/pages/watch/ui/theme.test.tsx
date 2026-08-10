import { rgbToHex } from '@opentui/core';
import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { KANAGAWA, THEMES } from '../../../shared/theme';
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

type Press = string | { key: string; lands?: string; leaves?: string };

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

const SECOND = THEMES[1]?.[0] ?? '';

const SECOND_WORN = THEMES[1]?.[1];

const PICKED: Press = { key: 't', lands: 'themes' };

const BROWSED: Press = { key: 'ARROW_DOWN', lands: `► ${SECOND}` };

function crumbTone(): string {
  const spans = (rendered?.captureSpans().lines ?? []).flatMap((line) => line.spans);
  const crumb = spans.find((span) => span.text === 'board');

  return crumb === undefined ? '' : rgbToHex(crumb.fg).toLowerCase();
}

function sheetTone(): string {
  const first = (rendered?.captureSpans().lines ?? [])[0]?.spans[0];

  return first === undefined ? '' : rgbToHex(first.bg).toLowerCase();
}

function panelTone(mark: string): string {
  const spans = (rendered?.captureSpans().lines ?? []).flatMap((line) => line.spans);
  const row = spans.find((span) => span.text.includes(mark));

  return row === undefined ? '' : rgbToHex(row.bg).toLowerCase();
}

describe('the theme picker over the watch', () => {
  it('opens on t and lists the wardrobe with color strips', async () => {
    const frame = await opening([PICKED]);

    expect(frame).toContain('themes');
    expect(frame).toContain(SECOND);
    expect(frame).toContain('██');
  });

  it('keeps the theme name out of the header', async () => {
    const frame = await opening([]);

    expect(frame).not.toContain('kanagawa');
  });

  it('previews the selection while the picker is open', async () => {
    await opening([PICKED, BROWSED]);

    expect(crumbTone()).toBe(
      SECOND_WORN?.gray.toLowerCase() ?? 'the wardrobe lost its second theme',
    );
  });

  it('keeps the previewed theme on enter', async () => {
    const frame = await opening([
      PICKED,
      BROWSED,
      { key: 'RETURN', leaves: 'themes' },
      { key: 't', lands: 'themes' },
    ]);

    expect(frame).toContain(`► ${SECOND}`);
  });

  it('restores the kept theme on escape', async () => {
    const frame = await opening([
      PICKED,
      BROWSED,
      { key: 'ESCAPE', leaves: 'themes' },
      { key: 't', lands: 'themes' },
    ]);

    expect(frame).toContain('► kanagawa');
    expect(frame).not.toContain(`► ${SECOND}`);
  });

  it('stays out of the way of a gate ceremony', async () => {
    const frame = await opening([{ key: 'a', lands: 'approve gate' }, 't']);

    expect(frame).toContain('approve gate');
    expect(frame).not.toContain('themes');
  });
});

describe('the ground the watch paints beneath itself', () => {
  it('grounds the screen in the worn theme base', async () => {
    await opening([]);

    expect(sheetTone()).toBe(KANAGAWA.base.toLowerCase());
  });

  it('repaints the ground as the picker previews a theme', async () => {
    await opening([PICKED, BROWSED]);

    expect(sheetTone()).toBe(
      SECOND_WORN?.base.toLowerCase() ?? 'the wardrobe lost its second theme',
    );
  });

  it('lifts the picker panel off the ground it covers', async () => {
    await opening([PICKED]);

    expect(panelTone('kanagawa')).toBe(KANAGAWA.mantle.toLowerCase());
  });
});
