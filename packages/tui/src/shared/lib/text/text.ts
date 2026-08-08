const ELLIPSIS = '…';

const WIDE: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
];

const CLUSTERS = new Intl.Segmenter('en', { granularity: 'grapheme' });

function clustersOf(text: string): string[] {
  return [...CLUSTERS.segment(text)].map((piece) => piece.segment);
}

// A cluster paints as wide as its leading code point, which is what makes a
// joined emoji two columns rather than one per member.
function clusterWidth(cluster: string): number {
  const lead = cluster.codePointAt(0);

  if (lead === undefined) {
    return 0;
  }

  return WIDE.some(([low, high]) => lead >= low && lead <= high) ? 2 : 1;
}

export function widthOf(text: string): number {
  return clustersOf(text).reduce((room, cluster) => room + clusterWidth(cluster), 0);
}

function keptWithin(clusters: string[], room: number): string {
  let taken = 0;
  const kept: string[] = [];

  for (const cluster of clusters) {
    const grown = taken + clusterWidth(cluster);

    if (grown > room) {
      return kept.join('');
    }

    taken = grown;
    kept.push(cluster);
  }

  return kept.join('');
}

export function clipped(text: string, room: number): string {
  if (widthOf(text) <= room) {
    return text;
  }

  return room <= 0 ? '' : `${keptWithin(clustersOf(text), room - 1)}${ELLIPSIS}`;
}

function chunked(word: string, room: number): string[] {
  const pieces: string[] = [];
  let rest = word;

  while (widthOf(rest) > room) {
    const head = keptWithin(clustersOf(rest), room);

    if (head === '') {
      return [...pieces, clipped(rest, room)];
    }

    pieces.push(head);
    rest = rest.slice(head.length);
  }

  return rest === '' ? pieces : [...pieces, rest];
}

interface Folded {
  lines: string[];
  used: number;
}

function joinedInto(lines: string[], word: string, room: number): boolean {
  const open = lines[lines.length - 1];

  if (open === undefined) {
    return false;
  }

  const joined = `${open} ${word}`;

  if (widthOf(joined) > room) {
    return false;
  }

  lines[lines.length - 1] = joined;

  return true;
}

function filled(words: string[], room: number, most: number): Folded {
  const lines: string[] = [];
  let used = 0;

  for (const word of words) {
    if (!joinedInto(lines, word, room)) {
      const pieces = chunked(word, room);

      if (lines.length + pieces.length > most) {
        return { lines, used };
      }

      lines.push(...pieces);
    }

    used += 1;
  }

  return { lines, used };
}

function spilled(words: string[], room: number, most: number): string[] {
  const whole = filled(words, room, most);

  if (whole.used === words.length) {
    return whole.lines;
  }

  const head = filled(words, room, most - 1);

  return [...head.lines, clipped(words.slice(head.used).join(' '), room)];
}

export function wrappedTo(text: string, room: number, most: number): string[] {
  const words = text.split(/\s+/u).filter((word) => word !== '');

  return words.length === 0 || room < 1 ? [] : spilled(words, room, most);
}
