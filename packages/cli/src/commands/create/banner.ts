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
