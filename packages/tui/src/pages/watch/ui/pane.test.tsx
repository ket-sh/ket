import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

type Key = 'ARROW_RIGHT' | 'ARROW_LEFT' | 'RETURN' | 'TAB';

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

async function workflowAt(width: number, then: Key[] = []): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width, height: 40 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  keys.pressKey('RETURN');

  let frame = await landed((seen) => seen.includes('Not started'));

  for (const key of then) {
    const before = frame;

    keys.pressKey(key);
    frame = await landed((seen) => seen !== before);
  }

  return frame;
}

describe('the side pane beside the workflow canvas', () => {
  it('leads with the key, the kind and the size', async () => {
    expect(await workflowAt(160)).toContain('K-1  feature · story');
  });

  it('frames its facts under labeled rules', async () => {
    const frame = await workflowAt(160);

    expect(frame).toContain('─ state ');
    expect(frame).toContain('─ yours ');
    expect(frame).toContain('─ repo ');
  });

  it('says the status and the place it holds on the machine path', async () => {
    expect(await workflowAt(160)).toContain('designing · stage 3 of 8');
  });

  it('raises the refusal count and the reason beside it', async () => {
    expect(await workflowAt(200)).toContain('refused 1x  no failing test covers it');
  });

  it('clips the reason rather than bleeding it past the pane', async () => {
    const frame = await workflowAt(160);

    expect(frame).toContain('refused 1x  no failing test cover…');
  });

  it('says who filed the item and how long the stage has held it', async () => {
    const frame = await workflowAt(160);

    expect(frame).toContain('filed by Ada Lovelace · 4h ago');
    expect(frame).toContain('in stage 2h');
    expect(frame).toContain('last event 1h ago');
  });

  it('sums the children into one line', async () => {
    const frame = await workflowAt(160);

    expect(frame).toContain('children 0/1 shipped');
  });

  it('names the branch the work sits on', async () => {
    expect(await workflowAt(160)).toContain('feat/watched · 4 commits');
  });

  it('keeps saying its piece on a terminal too narrow to seat it on the right', async () => {
    const frame = await workflowAt(100);

    expect(frame).toContain('K-1  feature · story');
    expect(frame).toContain('children 0/1 shipped');
  });
});

describe('the way the key bar advertises the pane', () => {
  it('says nothing about the pane while nodes still lie to the right', async () => {
    expect(await workflowAt(160)).not.toContain('item pane');
  });

  it('says the pane is one arrow away once the canvas runs out', async () => {
    const frame = await workflowAt(160, ['ARROW_RIGHT']);

    expect(frame).toContain('→ item pane');
  });

  it('names what enter means once the pane holds the selection', async () => {
    const frame = await workflowAt(160, ['ARROW_RIGHT', 'ARROW_RIGHT']);

    expect(frame).toContain('⏎ children');
    expect(frame).toContain('← canvas');
  });
});

describe('the jump the children summary offers', () => {
  it('takes the selection into the pane once the canvas runs out to the right', async () => {
    const frame = await workflowAt(160, ['ARROW_RIGHT', 'ARROW_RIGHT']);

    expect(frame).toContain('▸ children 0/1 shipped');
  });

  it('hands the selection back to the canvas on the way left', async () => {
    const frame = await workflowAt(160, ['ARROW_RIGHT', 'ARROW_RIGHT', 'ARROW_LEFT']);

    expect(frame).toContain('children 0/1 shipped');
    expect(frame).not.toContain('▸ children');
  });

  it('opens the children tab on enter once the pane holds the selection', async () => {
    const frame = await workflowAt(160, ['ARROW_RIGHT', 'ARROW_RIGHT', 'RETURN']);

    expect(frame).toContain('A quiet fix');
  });

  it('leaves enter on the canvas opening the stage it sits on', async () => {
    const frame = await workflowAt(160, ['RETURN']);

    expect(frame).not.toContain('A quiet fix');
  });
});
