import type { KanbanCardView, KanbanColumnView, KanbanRefusalView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

export const BELL = '🔔';

export interface AttentionBell {
  signature: string;
  message: string;
}

const HUMAN_GATES = ['awaiting-approval', 'awaiting-merge'];

export function waitsOnAHuman(status: string): boolean {
  return HUMAN_GATES.includes(status);
}

export function needsYou(card: KanbanCardView): boolean {
  return waitsOnAHuman(card.status) || card.refusal !== undefined;
}

export function accentOf(card: KanbanCardView, theme: Theme): string | undefined {
  return needsYou(card) ? theme.yellow : undefined;
}

const MOVE_GATE = 'transition';

function refusalWord(refusal: KanbanRefusalView): string {
  return refusal.gate === MOVE_GATE ? 'sent back' : 'changes requested';
}

function gateBells(card: KanbanCardView): AttentionBell[] {
  if (!waitsOnAHuman(card.status)) {
    return [];
  }

  return [
    {
      signature: `${card.key} ${card.status} ${card.since ?? ''}`,
      message: `${card.key} needs you · ${card.status}`,
    },
  ];
}

function refusalBells(card: KanbanCardView): AttentionBell[] {
  if (card.refusal === undefined) {
    return [];
  }

  return [
    {
      signature: `${card.key} refusal ${card.refusal.at}`,
      message: `${card.key} ${refusalWord(card.refusal)} · ${card.refusal.reason}`,
    },
  ];
}

export function bellsAmong(columns: KanbanColumnView[]): AttentionBell[] {
  return columns
    .flatMap((column) => column.cards)
    .flatMap((card) => [...gateBells(card), ...refusalBells(card)]);
}
