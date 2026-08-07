export type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export interface Nudge {
  col: number;
  row: number;
}

export const DELTA: Record<Direction, Nudge> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export function asDirection(name: string): Direction | undefined {
  return DIRECTIONS.find((direction) => direction === name);
}
