import type { ItemStatus } from './item.ts';
import type { SurfaceDoc } from './surface-doc.ts';

export type JourneyMark = 'done' | 'active' | 'pending';

export interface JourneyNode {
  id: string;
  kind: 'stage' | 'artifact' | 'child';
  title: string;
  mark: JourneyMark;
  at: string | undefined;
  until: string | undefined;
  child: string | undefined;
  doc: SurfaceDoc | undefined;
}

export interface Journey {
  item: string;
  title: string;
  nodes: JourneyNode[];
  edges: [string, string][];
  standing: string | undefined;
}

export interface Visit {
  id: string;
  status: ItemStatus;
  at: string | undefined;
  until: string | undefined;
}

export interface Pieces {
  nodes: JourneyNode[];
  edges: [string, string][];
}
