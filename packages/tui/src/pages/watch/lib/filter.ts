import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { narrowedRows } from './narrowing.ts';

type Answers = (card: KanbanCardView) => boolean;

function stageAnswers(wanted: string): Answers {
  return (card) => card.status.toLowerCase().startsWith(wanted);
}

function kindAnswers(wanted: string): Answers {
  return (card) => card.kind?.toLowerCase().startsWith(wanted) === true;
}

function wordAnswers(word: string): Answers {
  return (card) => card.key.toLowerCase().includes(word) || card.title.toLowerCase().includes(word);
}

function answersOf(token: string): Answers {
  if (token.startsWith('s:')) {
    return stageAnswers(token.slice(2));
  }

  return token.startsWith('k:') ? kindAnswers(token.slice(2)) : wordAnswers(token);
}

export function narrowedBy(columns: KanbanColumnView[], query: string): KanbanColumnView[] {
  return columns.map((column) => ({
    ...column,
    cards: narrowedRows(column.cards, query, answersOf),
  }));
}
