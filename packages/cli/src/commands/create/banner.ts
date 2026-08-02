export type Shade = [number, number, number];

export const KET_BANNER = [
  '██  ██  █████  ██████',
  '██ ██   ██       ██',
  '████    ████     ██',
  '██ ██   ██       ██',
  '██  ██  █████    ██',
];

const ADVERTISED_DEPTHS = new Set(['truecolor', '24bit']);

const DIRECT_TERMINAL = /-(truecolor|direct)$/;

export function supportsTrueColor(advertisedDepth: string, terminalType: string): boolean {
  return ADVERTISED_DEPTHS.has(advertisedDepth) || DIRECT_TERMINAL.test(terminalType);
}

function between(from: number, to: number, step: number, steps: number): number {
  return Math.round(from + ((to - from) * step) / steps);
}

function shadeAt(from: Shade, to: Shade, step: number, steps: number): Shade {
  return [
    between(from[0], to[0], step, steps),
    between(from[1], to[1], step, steps),
    between(from[2], to[2], step, steps),
  ];
}

function painted(line: string, [red, green, blue]: Shade): string {
  return `[38;2;${String(red)};${String(green)};${String(blue)}m${line}[39m`;
}

export function gradientOver(pieces: string[], from: Shade, to: Shade): string[] {
  const steps = Math.max(pieces.length - 1, 1);

  return pieces.map((piece, step) => painted(piece, shadeAt(from, to, step, steps)));
}

type Role = 'torii' | 'cat' | 'ground';

const TORII_SHADE: Shade = [216, 72, 39];

const CAT_SHADE: Shade = [255, 217, 168];

const GROUND_SHADE: Shade = [74, 124, 89];

const SHADE_OF: Record<Role, Shade> = {
  torii: TORII_SHADE,
  cat: CAT_SHADE,
  ground: GROUND_SHADE,
};

type Segment = readonly [Role, string];

const ROOF_TOP: Segment = ['torii', '▗▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▖'];

const ROOF_UNDERSIDE: Segment = ['torii', '▝▀▀▀█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█▀▀▀▘'];

const NECK: Segment = ['torii', '    █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█'];

const PILLAR_GAP: Segment = ['torii', '    █               █'];

const TORII_ROWS: readonly (readonly Segment[])[] = [
  [ROOF_TOP],
  [ROOF_UNDERSIDE],
  [NECK],
  [PILLAR_GAP],
  [
    ['torii', '    █      '],
    ['cat', '▄ ▄'],
    ['torii', '      █'],
  ],
  [
    ['torii', '    █      '],
    ['cat', '███▖'],
    ['torii', '     █'],
  ],
  [
    ['torii', '    █      '],
    ['cat', '▜█▛'],
    ['torii', '      █'],
  ],
  [PILLAR_GAP],
  [
    ['ground', ' ▁▁▁'],
    ['torii', '█'],
    ['ground', '▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁'],
    ['torii', '█'],
    ['ground', '▁▁▁'],
  ],
];

export function paintedTorii(): string[] {
  return TORII_ROWS.map((segments) =>
    segments.map(([role, glyphs]) => painted(glyphs, SHADE_OF[role])).join(''),
  );
}

const ART_WIDTH = 25;

const TEXT_GAP = '   ';

const BODY_FIRST_ROW = 3;

const BODY_LAST_ROW = 7;

const ANSI_CODE = new RegExp(`${String.fromCharCode(27)}\\[[\\d;]+m`, 'gu');

function plainWidth(line: string): number {
  return line.replaceAll(ANSI_CODE, '').length;
}

function paddedToArtWidth(line: string): string {
  return line + ' '.repeat(ART_WIDTH - plainWidth(line));
}

export function toriiBeside(text: string[]): string[] {
  return paintedTorii().map((row, index) => {
    if (index < BODY_FIRST_ROW || index > BODY_LAST_ROW) {
      return row;
    }

    return `${paddedToArtWidth(row)}${TEXT_GAP}${text[index - BODY_FIRST_ROW] ?? ''}`;
  });
}
