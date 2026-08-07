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

interface SketchNodeView {
  id: string;
  label: string;
}

interface SketchEdgeView {
  from: string;
  to: string;
  label: string | undefined;
}

export interface SketchView {
  nodes: SketchNodeView[];
  edges: SketchEdgeView[];
}

export interface CalloutView {
  claim: string;
  shape: string;
}

interface VerdictRowView {
  option: string;
  chosen: boolean;
  glyphs: string[];
}

interface LedgerLineView {
  at: string;
  text: string;
  refused: boolean;
}

interface AudienceSidesView {
  label: string;
  tech: string;
  plain: string | undefined;
  note: string | undefined;
}

export type SurfaceDocView =
  | ({ kind: 'prose' } & AudienceSidesView)
  | ({
      kind: 'design';
      callouts: CalloutView[];
      sketch: SketchView | undefined;
    } & AudienceSidesView)
  | { kind: 'sketch'; label: string; sketch: SketchView; callouts: CalloutView[] }
  | { kind: 'criteria'; label: string; name: string; source: string }
  | {
      kind: 'decision';
      label: string;
      tech: string;
      plain: string | undefined;
      drivers: string[];
      rows: VerdictRowView[];
    }
  | { kind: 'diff'; label: string; text: string }
  | {
      kind: 'blast';
      label: string;
      base: string;
      collapse: number;
      budget: number;
      shown: number;
      uncollapsedNodes: number;
      uncollapsedEdges: number;
      sketch: SketchView;
    }
  | { kind: 'ledger'; label: string; lines: LedgerLineView[] };

export interface JourneyNodeView {
  id: string;
  kind: 'stage' | 'artifact' | 'child';
  title: string;
  mark: 'done' | 'active' | 'pending';
  at: string | undefined;
  child: string | undefined;
  doc: SurfaceDocView | undefined;
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
