import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { paneFitOf, panePlaceOf } from './pane-place.ts';

describe('where the side pane sits beside the canvas', () => {
  it('takes a quarter of a wide terminal and leaves the rest to the canvas', () => {
    expect(panePlaceOf(120)).toStrictEqual({ side: 'right', paneWidth: 30, canvasWidth: 90 });
  });

  it('stays beside the canvas while the canvas still spans eighty columns', () => {
    expect(panePlaceOf(107)).toStrictEqual({ side: 'right', paneWidth: 27, canvasWidth: 80 });
  });

  it('drops under the canvas as soon as the canvas would fall under eighty', () => {
    expect(panePlaceOf(106)).toStrictEqual({ side: 'bottom', paneWidth: 106, canvasWidth: 106 });
  });

  it('gives a narrow terminal the whole width for both', () => {
    expect(panePlaceOf(80)).toStrictEqual({ side: 'bottom', paneWidth: 80, canvasWidth: 80 });
  });
});

describe('the rows a bottom pane shares with the canvas', () => {
  it('hands every pane line room when the height allows it', () => {
    expect(paneFitOf(29, 12)).toStrictEqual({ canvasHeight: 15, paneLines: 12 });
  });

  it('keeps a whole stage frame on the canvas before the pane speaks', () => {
    expect(paneFitOf(13, 7)).toStrictEqual({ canvasHeight: 8, paneLines: 3 });
  });

  it('gives the canvas everything when the pane would lose every line', () => {
    expect(paneFitOf(9, 7)).toStrictEqual({ canvasHeight: 8, paneLines: 0 });
  });

  it('never plans more rows than the terminal holds, once a frame fits at all', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 80 }),
        fc.integer({ min: 0, max: 30 }),
        (height, lineCount) => {
          const fit = paneFitOf(height, lineCount);
          const paneRows = fit.paneLines === 0 ? 0 : fit.paneLines + 2;

          expect(fit.canvasHeight + paneRows).toBeLessThanOrEqual(height);
        },
      ),
    );
  });
});

describe('what the placement promises at every terminal width', () => {
  it('never lets a side pane squeeze the canvas under eighty columns', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), (width) => {
        const place = panePlaceOf(width);

        fc.pre(place.side === 'right');
        expect(place.canvasWidth).toBeGreaterThanOrEqual(80);
      }),
    );
  });

  it('never asks for more columns than the terminal has', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), (width) => {
        const place = panePlaceOf(width);
        const asked = place.side === 'right' ? place.paneWidth + place.canvasWidth : width;

        expect(asked).toBe(width);
      }),
    );
  });
});
