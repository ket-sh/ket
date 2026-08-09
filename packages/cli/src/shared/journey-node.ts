import type { ItemStatus } from './item.ts';
import type { ItemNote, KanbanRefusal } from './kanban.ts';
import type { SurfaceDoc } from './surface-doc.ts';
import type { GateAction } from './transition.ts';

export type StageState =
  | 'done'
  | 'running'
  | 'needs-you'
  | 'changes-requested'
  | 'sent-back'
  | 'future';

export interface JourneyNode {
  id: string;
  title: string;
  state: StageState;
  at: string | undefined;
  until: string | undefined;
  refusal: KanbanRefusal | undefined;
  note: ItemNote | undefined;
  doc: SurfaceDoc | undefined;
}

export interface JourneyArtifact {
  path: string;
  name: string;
  at: string | undefined;
  doc: SurfaceDoc | undefined;
}

export interface JourneyChild {
  key: string;
  title: string;
  size: string;
  status: ItemStatus;
  since: string | undefined;
  refusal: KanbanRefusal | undefined;
}

interface JourneyFiling {
  by: string;
  at: string;
}

interface JourneyBranch {
  name: string;
  commits: number;
}

export interface RepoFacts {
  filed: JourneyFiling | undefined;
  branch: JourneyBranch | undefined;
}

export interface JourneyPane {
  kind: string;
  size: string;
  status: ItemStatus;
  stageAt: number;
  stageOf: number;
  parent: string | undefined;
  refusedTimes: number;
  arrivedAt: string | undefined;
  lastEventAt: string | undefined;
  filed: JourneyFiling | undefined;
  branch: JourneyBranch | undefined;
  note: ItemNote | undefined;
  offers: GateAction[];
}

export interface Journey {
  item: string;
  title: string;
  description: string | undefined;
  nodes: JourneyNode[];
  edges: [string, string][];
  standing: string | undefined;
  artifacts: JourneyArtifact[];
  children: JourneyChild[];
  pane: JourneyPane;
}

export interface Visit {
  id: string;
  status: ItemStatus;
  at: string | undefined;
  until: string | undefined;
}
