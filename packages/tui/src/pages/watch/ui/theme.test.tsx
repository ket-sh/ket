import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { THEMES } from '../../../shared/theme';
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

async function opening(keys: string[]): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await settled();

  for (const key of keys) {
    createMockKeys(opened.renderer).pressKey(key);
    frame = await settled();
  }

  return frame;
}

const SECOND = THEMES[1]?.[0] ?? '';

describe('the theme picker over the watch', () => {
  it('opens on t and lists the wardrobe with color strips', async () => {
    const frame = await opening(['t']);

    expect(frame).toContain('themes');
    expect(frame).toContain(SECOND);
    expect(frame).toContain('██');
  });

  it('names the worn theme in the header', async () => {
    const frame = await opening([]);

    expect(frame).toContain('kanagawa');
  });

  it('previews the selection while the picker is open', async () => {
    const frame = await opening(['t', 'ARROW_DOWN']);

    const header = frame.split('\n')[1] ?? '';

    expect(header).toContain(SECOND);
  });

  it('keeps the previewed theme on enter', async () => {
    const frame = await opening(['t', 'ARROW_DOWN', 'RETURN']);

    expect(frame).not.toContain('themes');
    expect(frame).toContain(SECOND);
  });

  it('restores the kept theme on escape', async () => {
    const frame = await opening(['t', 'ARROW_DOWN', 'ESCAPE']);

    expect(frame).not.toContain(SECOND);
    expect(frame).toContain('kanagawa');
  });

  it('stays out of the way of a gate ceremony', async () => {
    const frame = await opening(['a', 't']);

    expect(frame).toContain('approve gate');
    expect(frame).not.toContain('themes');
  });
});
