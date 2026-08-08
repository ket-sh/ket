import type { ItemStatus } from './item.ts';
import type { KanbanRefusal } from './kanban.ts';
import type { SurfaceDoc } from './surface-doc.ts';

export type JourneyMark = 'done' | 'active' | 'future';

export interface JourneyNode {
  id: string;
  title: string;
  mark: JourneyMark;
  at: string | undefined;
  until: string | undefined;
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

export interface Journey {
  item: string;
  title: string;
  nodes: JourneyNode[];
  edges: [string, string][];
  standing: string | undefined;
  artifacts: JourneyArtifact[];
  children: JourneyChild[];
}

export interface Visit {
  id: string;
  status: ItemStatus;
  at: string | undefined;
  until: string | undefined;
}
