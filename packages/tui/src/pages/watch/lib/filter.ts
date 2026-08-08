import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

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
  const asked = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((token) => token !== '')
    .map((token) => answersOf(token));

  if (asked.length === 0) {
    return columns;
  }

  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => asked.every((answers) => answers(card))),
  }));
}
