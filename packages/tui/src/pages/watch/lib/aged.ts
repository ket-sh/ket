import type { KanbanCardView } from '../../../shared/model';

import { ageOf } from '../../../shared/lib';

export function agedOf(card: KanbanCardView, now: string): string {
  return card.since === undefined ? '' : ageOf(card.since, now);
}
