import { describe, expect, it } from 'vitest';

import { gradientOver, KET_BANNER, supportsTrueColor } from './banner.ts';

const CYAN: [number, number, number] = [0, 200, 100];
const INDIGO: [number, number, number] = [100, 0, 200];

const TRADITIONAL_TERMINAL = 80;

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
