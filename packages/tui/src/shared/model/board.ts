import type { MapReadingView } from './story-map.ts';

export interface KanbanRefusalView {
  reason: string;
  at: string;
  gate: string;
}

export interface ItemNoteView {
  text: string;
  actor: string;
  at: string;
}

export type GateActionView = 'approve' | 'ship' | 'reopen';

export interface KanbanCardView {
  key: string;
  title: string;
  size: string;
  status: string;
  kind?: string | undefined;
  parent: string | undefined;
  since: string | undefined;
  refusal: KanbanRefusalView | undefined;
  note: ItemNoteView | undefined;
  offers: GateActionView[];
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
  | ({ kind: 'blast'; label: string; base: string; sketch: SketchView } & BlastFiguresView)
  | { kind: 'ledger'; label: string; lines: LedgerLineView[] };

interface BlastFiguresView {
  collapse: number;
  budget: number;
  shown: number;
  uncollapsedNodes: number;
  uncollapsedEdges: number;
}

export type StageStateView =
  | 'done'
  | 'running'
  | 'needs-you'
  | 'changes-requested'
  | 'sent-back'
  | 'future';

export interface JourneyNodeView {
  id: string;
  title: string;
  state: StageStateView;
  at: string | undefined;
  until: string | undefined;
  refusal: KanbanRefusalView | undefined;
  note: ItemNoteView | undefined;
  doc: SurfaceDocView | undefined;
}

export interface JourneyArtifactView {
  path: string;
  name: string;
  at: string | undefined;
  doc: SurfaceDocView | undefined;
}

export interface JourneyChildView {
  key: string;
  title: string;
  size: string;
  status: string;
  since: string | undefined;
  refusal: KanbanRefusalView | undefined;
}

export interface JourneyFilingView {
  by: string;
  at: string;
}

export interface JourneyBranchView {
  name: string;
  commits: number;
}

export interface JourneyPaneView {
  kind: string;
  size: string;
  status: string;
  stageAt: number;
  stageOf: number;
  parent: string | undefined;
  refusedTimes: number;
  arrivedAt: string | undefined;
  lastEventAt: string | undefined;
  filed: JourneyFilingView | undefined;
  branch: JourneyBranchView | undefined;
  note: ItemNoteView | undefined;
}

export interface JourneyView {
  item: string;
  title: string;
  description: string | undefined;
  nodes: JourneyNodeView[];
  edges: [string, string][];
  standing: string | undefined;
  artifacts: JourneyArtifactView[];
  children: JourneyChildView[];
  pane: JourneyPaneView;
}

export type MovedView = { moved: string } | { refused: string };

export interface OplogEventView {
  outcome: string | undefined;
  gate: string | undefined;
  about: string | undefined;
  item: string | undefined;
  reason: string | undefined;
  at: string | undefined;
  note: string | undefined;
  actor: string | undefined;
}

export interface BoardFeed {
  snapshot: () => Promise<KanbanColumnView[]>;
  storyMap: () => Promise<MapReadingView>;
  journey: (key: string) => Promise<JourneyView | undefined>;
  act: (key: string, gate: GateActionView) => Promise<MovedView>;
  saveCriteria: (key: string, name: string, source: string) => Promise<void>;
  oplog: () => Promise<OplogEventView[]>;
  subscribe: (refresh: () => void) => () => void;
}
