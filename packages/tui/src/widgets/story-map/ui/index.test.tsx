import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { MapReadingView } from '../../../shared/model';

import { ThemeProvider } from '../../../shared/theme';
import { MapPane } from './index.tsx';

const READING: MapReadingView = {
  map: {
    product: { name: 'shop', idea: 'a place to buy a thing' },
    spine: [
      {
        activity: 'buy a thing',
        steps: [
          { id: 's-browse', name: 'browse the catalog' },
          { id: 's-pay', name: 'pay for it' },
        ],
      },
      { activity: 'return a thing', steps: [{ id: 's-ask', name: 'ask for a refund' }] },
    ],
    bands: [
      {
        id: 'r-skeleton',
        name: 'walking skeleton',
        outcome: 'one real purchase',
        cards: [
          { id: 'st-see', name: 'see the shelves', step: 's-browse', user: 'u-shopper' },
          { id: 'st-card', name: 'pay by card', step: 's-pay' },
        ],
      },
      { id: 'r-next', name: 'the next cut', outcome: 'a shopper returns', cards: [] },
      {
        id: undefined,
        name: 'unassigned',
        outcome: undefined,
        cards: [{ id: 'st-refund', name: 'get money back', step: 's-ask' }],
      },
    ],
  },
};

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

  while (!done(frame) && Date.now() - started < 2_000) {
    frame = await settled();
  }

  return frame;
}

async function opened(reading: MapReadingView, at: number, mark: string): Promise<string> {
  rendered = await testRender(
    <ThemeProvider>
      <MapPane reading={reading} at={at} />
    </ThemeProvider>,
    { width: 160, height: 44 },
  );

  return landed((frame) => frame.includes(mark));
}

describe('the map the pane draws', () => {
  it('raises the product and the idea behind it over the map', async () => {
    const frame = await opened(READING, 0, 'shop');

    expect(frame).toContain('shop');
    expect(frame).toContain('a place to buy a thing');
  });

  it('lays each activity over the steps that hang under it', async () => {
    const frame = await opened(READING, 0, 'buy a thing');

    expect(frame).toContain('buy a thing');
    expect(frame).toContain('return a thing');
    expect(frame).toContain('browse the catalog');
    expect(frame).toContain('pay for it');
    expect(frame).toContain('ask for a refund');
  });

  it('titles every band with its release and the outcome it promised', async () => {
    const frame = await opened(READING, 0, 'walking skeleton');

    expect(frame).toContain('walking skeleton');
    expect(frame).toContain('one real purchase');
  });

  it('draws the band that has won nothing yet rather than hiding it', async () => {
    const frame = await opened(READING, 0, 'the next cut');

    expect(frame).toContain('the next cut');
    expect(frame).toContain('a shopper returns');
  });

  it('closes the map with the unassigned bucket and the cards in it', async () => {
    const frame = await opened(READING, 0, 'unassigned');

    expect(frame).toContain('unassigned');
    expect(frame).toContain('get money back');
  });

  it('hangs every card somewhere on the page', async () => {
    const frame = await opened(READING, 0, 'see the shelves');

    expect(frame).toContain('see the shelves');
    expect(frame).toContain('pay by card');
  });
});

describe('the card the selection rests on', () => {
  it('wears the double border and spells itself out underneath', async () => {
    const frame = await opened(READING, 0, 'see the shelves');

    expect(frame).toContain('║ see the shelves');
    expect(frame).toContain('see the shelves · u-shopper · walking skeleton');
  });

  it('moves to the card the seat names, leaving the one before it', async () => {
    const frame = await opened(READING, 1, 'pay by card');

    expect(frame).toContain('║ pay by card');
    expect(frame).toContain('pay by card · walking skeleton');
    expect(frame).not.toContain('║ see the shelves');
  });

  it('crosses bands to reach the bucket, counting seats and not columns', async () => {
    const frame = await opened(READING, 2, 'get money back');

    expect(frame).toContain('║ get money back');
    expect(frame).toContain('get money back · unassigned');
  });
});

describe('a project that has never mapped anything', () => {
  it('says what a story map is and names the session that starts one', async () => {
    const frame = await opened({ absent: true }, 0, '/ket:map');

    expect(frame).toContain('/ket:map');
    expect(frame).toContain('releases');
  });
});

describe('a map file the reader turned away', () => {
  it('says the map could not be read and spells out every refusal', async () => {
    const frame = await opened(
      { refusals: ['the release r-skeleton carries no outcome', 'the id st-dup appears twice'] },
      0,
      'r-skeleton',
    );

    expect(frame).toContain('the release r-skeleton carries no outcome');
    expect(frame).toContain('the id st-dup appears twice');
  });
});
