import type { StoredSpot } from './carried.ts';

export const halfSpan = 6;

export interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function legalSpan(w: unknown): number {
  return Number(w) >= 9 ? 12 : halfSpan;
}

export function fitted(x: unknown, w: number): StoredSpot {
  const bound = 12 - w;
  const held = Math.min(Math.max(Number(x) || 0, 0), bound);
  const slot = held < halfSpan / 2 ? 0 : halfSpan;

  return { w, x: Math.min(slot, bound) };
}

export function legalLayout(saved: StoredSpot[]): StoredSpot[] {
  return saved.map((entry) => ({ ...entry, ...fitted(entry.x, legalSpan(entry.w)) }));
}

function overlapsRows(one: Spot, other: Spot): boolean {
  return one.y < other.y + other.h && other.y < one.y + one.h;
}

function halfLeaving(grabbed: Spot | undefined, landedX: number): grabbed is Spot {
  return grabbed?.w === halfSpan && grabbed.x !== landedX;
}

function swapCandidate(spot: Spot, grabbed: Spot, landedX: number): boolean {
  return spot.w === halfSpan && spot.x === landedX && overlapsRows(spot, grabbed);
}

export function swapPartner<Brick>(
  layout: ReadonlyMap<Brick, Spot>,
  dragged: Brick,
  landedX: number,
): Brick | undefined {
  const grabbed = layout.get(dragged);

  if (!halfLeaving(grabbed, landedX)) {
    return undefined;
  }

  for (const [brick, spot] of layout) {
    if (swapCandidate(spot, grabbed, landedX)) {
      return brick;
    }
  }

  return undefined;
}
