import type { Picker } from './picker.ts';

const PICKER_MOVES: Record<string, (picker: Picker) => void> = {
  up: (picker) => {
    picker.move(-1);
  },
  down: (picker) => {
    picker.move(1);
  },
  return: (picker) => {
    picker.keep();
  },
  enter: (picker) => {
    picker.keep();
  },
  escape: (picker) => {
    picker.close();
  },
};

export function pickerPress(name: string, picker: Picker): void {
  PICKER_MOVES[name]?.(picker);
}
