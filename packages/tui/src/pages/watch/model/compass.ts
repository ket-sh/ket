export type Direction = 'up' | 'down' | 'left' | 'right';

export type WheelDirection = Direction;

export const ACROSS: Record<WheelDirection, 'left' | 'right'> = {
  up: 'left',
  left: 'left',
  down: 'right',
  right: 'right',
};

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

export interface Pressed {
  name: string;
  seq: string;
  ctrl: boolean;
}

export function glyphOf(key: Pressed): string | undefined {
  return !key.ctrl && key.seq.length === 1 && key.seq >= ' ' ? key.seq : undefined;
}
