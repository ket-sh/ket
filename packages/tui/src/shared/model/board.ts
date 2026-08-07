export interface KanbanRefusalView {
  reason: string;
  at: string;
}

export interface KanbanCardView {
  key: string;
  title: string;
  size: string;
  status: string;
  since: string | undefined;
  refusal: KanbanRefusalView | undefined;
}

export interface KanbanColumnView {
  status: string;
  cards: KanbanCardView[];
}

export interface BoardFeed {
  snapshot: () => Promise<KanbanColumnView[]>;
  subscribe: (refresh: () => void) => () => void;
}
