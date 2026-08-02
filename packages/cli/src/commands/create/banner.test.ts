import { describe, expect, it } from 'vitest';

import {
  gradientOver,
  KET_BANNER,
  paintedTorii,
  supportsTrueColor,
  toriiBeside,
} from './banner.ts';

const CYAN: [number, number, number] = [0, 200, 100];
const INDIGO: [number, number, number] = [100, 0, 200];

const TRADITIONAL_TERMINAL = 80;

const ESCAPE = String.fromCharCode(27);

const ANSI_CODE = new RegExp(`${ESCAPE}\\[[\\d;]+m`, 'gu');

function bare(line: string): string {
  return line.replaceAll(ANSI_CODE, '');
}

function opensWith([red, green, blue]: [number, number, number]): string {
  return `${ESCAPE}[38;2;${String(red)};${String(green)};${String(blue)}m`;
}

function inColor(text: string, [red, green, blue]: [number, number, number]): string {
  return `[38;2;${String(red)};${String(green)};${String(blue)}m${text}[39m`;
}

describe('the art the banner draws', () => {
  it('draws something', () => {
    expect(KET_BANNER.length).toBeGreaterThan(0);
  });

  it('fits a traditional terminal, so it never wraps into nonsense', () => {
    for (const line of KET_BANNER) {
      expect({ line, fits: line.length <= TRADITIONAL_TERMINAL }).toStrictEqual({
        line,
        fits: true,
      });
    }
  });

  it('carries no trailing space, since a painted line would hide the drift', () => {
    for (const line of KET_BANNER) {
      expect(line).toBe(line.trimEnd());
    }
  });
});

describe('shading the banner from one color to another', () => {
  it('paints one line for every line of art', () => {
    expect(gradientOver(KET_BANNER, CYAN, INDIGO)).toHaveLength(KET_BANNER.length);
  });

  it('opens at the color it starts from', () => {
    expect(gradientOver(KET_BANNER, CYAN, INDIGO)[0]).toBe(
      `[38;2;0;200;100m${KET_BANNER[0]}[39m`,
    );
  });

  it('closes at the color it ends on', () => {
    const painted = gradientOver(KET_BANNER, CYAN, INDIGO);

    expect(painted.at(-1)).toBe(`[38;2;100;0;200m${KET_BANNER.at(-1) ?? ''}[39m`);
  });

  it('moves through the colors in between, rather than jumping at the end', () => {
    const painted = gradientOver(KET_BANNER, CYAN, INDIGO);
    const middle = painted[Math.floor(painted.length / 2)] ?? '';
    const [red] = /38;2;(\d+);/.exec(middle)?.slice(1) ?? [];

    expect(Number(red)).toBeGreaterThan(0);
    expect(Number(red)).toBeLessThan(100);
  });

  it('closes every line, so the color never leaks into what follows', () => {
    for (const line of gradientOver(KET_BANNER, CYAN, INDIGO)) {
      expect(line.endsWith('[39m')).toBe(true);
    }
  });
});

describe('deciding whether a terminal can hold a gradient', () => {
  it('trusts a terminal that advertises truecolor', () => {
    expect(supportsTrueColor('truecolor', '')).toBe(true);
  });

  it('trusts a terminal that advertises the same depth by number', () => {
    expect(supportsTrueColor('24bit', '')).toBe(true);
  });

  it('trusts a terminal whose type names direct color', () => {
    expect(supportsTrueColor('', 'xterm-direct')).toBe(true);
  });

  it('refuses a terminal that only advertises color, since 24 bits would garble it', () => {
    expect(supportsTrueColor('1', 'xterm-256color')).toBe(false);
  });

  it('refuses a terminal that advertises nothing', () => {
    expect(supportsTrueColor('', '')).toBe(false);
  });
});

describe('what the banner must never become', () => {
  it('draws blocks on every line, since an empty one is a hole in the letters', () => {
    for (const line of KET_BANNER) {
      expect({ line, draws: line.includes('█') }).toStrictEqual({ line, draws: true });
    }
  });

  it('refuses a terminal type that only mentions direct color in passing', () => {
    expect(supportsTrueColor('', 'xterm-direct-plus')).toBe(false);
  });
});

describe('spreading a gradient over any sequence, not only the banner', () => {
  it('gives a lone piece the color it starts from', () => {
    expect(gradientOver(['solo'], CYAN, INDIGO)).toStrictEqual([inColor('solo', CYAN)]);
  });

  it('gives a pair the two ends and nothing between', () => {
    expect(gradientOver(['left', 'right'], CYAN, INDIGO)).toStrictEqual([
      inColor('left', CYAN),
      inColor('right', INDIGO),
    ]);
  });

  it('paints nothing when there is nothing to paint', () => {
    expect(gradientOver([], CYAN, INDIGO)).toStrictEqual([]);
  });
});

const TORII_SHADE: [number, number, number] = [216, 72, 39];
const CAT_SHADE: [number, number, number] = [255, 217, 168];
const GROUND_SHADE: [number, number, number] = [74, 124, 89];

const ROOF_TOP = '▗▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▖';
const ROOF_UNDERSIDE = '▝▀▀▀█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█▀▀▀▘';
const NECK = '    █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█';
const PILLAR_GAP = '    █               █';

const EXPECTED_TORII_ROWS = [
  inColor(ROOF_TOP, TORII_SHADE),
  inColor(ROOF_UNDERSIDE, TORII_SHADE),
  inColor(NECK, TORII_SHADE),
  inColor(PILLAR_GAP, TORII_SHADE),
  [
    inColor('    █      ', TORII_SHADE),
    inColor('▄ ▄', CAT_SHADE),
    inColor('      █', TORII_SHADE),
  ].join(''),
  [
    inColor('    █      ', TORII_SHADE),
    inColor('███▖', CAT_SHADE),
    inColor('     █', TORII_SHADE),
  ].join(''),
  [
    inColor('    █      ', TORII_SHADE),
    inColor('▜█▛', CAT_SHADE),
    inColor('      █', TORII_SHADE),
  ].join(''),
  inColor(PILLAR_GAP, TORII_SHADE),
  [
    inColor(' ▁▁▁', GROUND_SHADE),
    inColor('█', TORII_SHADE),
    inColor('▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', GROUND_SHADE),
    inColor('█', TORII_SHADE),
    inColor('▁▁▁', GROUND_SHADE),
  ].join(''),
];

describe('drawing the torii gate with the cat sitting beside it', () => {
  it('draws exactly nine rows, the height the approved art specifies', () => {
    expect(paintedTorii()).toHaveLength(9);
  });

  it('paints every row exactly as the approved art specifies, glyph for glyph', () => {
    expect(paintedTorii()).toStrictEqual(EXPECTED_TORII_ROWS);
  });

  it('never spans past the 25 plain columns the gate was drawn to', () => {
    const widths = paintedTorii().map((row) => bare(row).length);

    expect(Math.max(...widths)).toBe(25);
  });

  it('paints the cat only where the cat sits, rows 5 through 7', () => {
    const rowsWithCat = paintedTorii()
      .map((row, index) => (row.includes(opensWith(CAT_SHADE)) ? index : -1))
      .filter((index) => index !== -1);

    expect(rowsWithCat).toStrictEqual([4, 5, 6]);
  });

  it('paints the ground only where the ground sits, row 9', () => {
    const rowsWithGround = paintedTorii()
      .map((row, index) => (row.includes(opensWith(GROUND_SHADE)) ? index : -1))
      .filter((index) => index !== -1);

    expect(rowsWithGround).toStrictEqual([8]);
  });
});

const BODY_TEXT = ['one', 'two', 'three', 'four', 'five'];

describe('sitting the block letters beside the torii gate', () => {
  it('keeps nine rows once the letters sit beside the gate', () => {
    expect(toriiBeside(BODY_TEXT)).toHaveLength(9);
  });

  it('leaves the roof, the neck, and the ground exactly as drawn, with no letters beside them', () => {
    const beside = toriiBeside(BODY_TEXT);
    const art = paintedTorii();

    expect(beside[0]).toBe(art[0]);
    expect(beside[1]).toBe(art[1]);
    expect(beside[2]).toBe(art[2]);
    expect(beside[8]).toBe(art[8]);
  });

  it('pads the gate body to 25 plain columns, opens a three space gap, then sets the matching line of letters', () => {
    const art = paintedTorii();
    const beside = toriiBeside(BODY_TEXT);
    const pad = '    ';

    expect(beside[3]).toBe(`${art[3]}${pad}   ${BODY_TEXT[0]}`);
    expect(beside[4]).toBe(`${art[4]}${pad}   ${BODY_TEXT[1]}`);
    expect(beside[5]).toBe(`${art[5]}${pad}   ${BODY_TEXT[2]}`);
    expect(beside[6]).toBe(`${art[6]}${pad}   ${BODY_TEXT[3]}`);
    expect(beside[7]).toBe(`${art[7]}${pad}   ${BODY_TEXT[4]}`);
  });

  it('opens the gap even when a line of letters runs out early, rather than printing "undefined"', () => {
    const beside = toriiBeside(['only one line']);
    const art = paintedTorii();
    const pad = '    ';

    expect(beside[3]).toBe(`${art[3]}${pad}   only one line`);
    expect(beside[4]).toBe(`${art[4]}${pad}   `);
  });
});
