import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';
import type { WatchMouse } from '../model/mouse.ts';
import type { Picker } from '../model/picker.ts';
import type { RoomProps } from './stage.tsx';

import { GateModal } from './gate.tsx';
import { ThemePicker } from './theme.tsx';

function statusOf(columns: KanbanColumnView[], key: string): string | undefined {
  return columns.flatMap((column) => column.cards).find((card) => card.key === key)?.status;
}

export function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<
  RoomProps,
  'seat' | 'now' | 'layout' | 'mouse' | 'logRows' | 'calm' | 'totals' | 'unfiled' | 'shelfSeat'
>): ReactNode {
  if (stack.top.kind !== 'gate') {
    return null;
  }

  return (
    <GateModal
      frame={stack.top}
      from={statusOf(columns, stack.top.cardKey)}
      tick={tick}
      width={width}
      height={height}
    />
  );
}

export function PickerOverlay({
  picker,
  width,
  height,
  mouse,
}: {
  picker: Picker;
  width: number;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  if (picker.at === undefined) {
    return null;
  }

  return <ThemePicker at={picker.at} width={width} height={height} mouse={mouse} />;
}
