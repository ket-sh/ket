import type { BoardLayout } from './board-layout.ts';
import type { Filter } from './filter.ts';
import type { FrameStack } from './frames.ts';
import type { Help } from './help.ts';
import type { Palette } from './palette.ts';
import type { Picker } from './picker.ts';
import type { Seat } from './seat.ts';
import type { ShelfSeat } from './shelf-seat.ts';

export interface PressDeps {
  onQuit: () => void;
  refresh: () => void;
  stack: FrameStack;
  seat: Seat;
  most: number;
  tick: number;
  layout: BoardLayout;
  shelfSeat: ShelfSeat;
  filedLeft: number;
  swap: () => void;
  queue: () => void;
  shelve: () => void;
  picker: Picker;
  filter: Filter;
  logFilter: Filter;
  palette: Palette;
  help: Help;
}
