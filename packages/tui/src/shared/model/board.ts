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

export interface JourneyNodeView {
  id: string;
  kind: 'stage' | 'artifact' | 'child';
  title: string;
  mark: 'done' | 'active' | 'pending';
  at: string | undefined;
  child: string | undefined;
}

export interface JourneyView {
  item: string;
  title: string;
  nodes: JourneyNodeView[];
  edges: [string, string][];
  standing: string | undefined;
}

export interface BoardFeed {
  snapshot: () => Promise<KanbanColumnView[]>;
  journey: (key: string) => Promise<JourneyView | undefined>;
  subscribe: (refresh: () => void) => () => void;
}
