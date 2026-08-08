export interface DocsTouchView {
  by: string;
  at: string;
  subject: string;
}

type DocsRotView = 'fresh' | 'stale' | 'unpinned' | 'broken';

export interface DocsPageRowView {
  kind: 'page';
  path: string;
  name: string;
  category: string | undefined;
  sources: string[];
  rot: DocsRotView;
  broken: string | undefined;
  touch: DocsTouchView | undefined;
}

export interface DocsRecordRowView {
  kind: 'record';
  path: string;
  name: string;
  touch: DocsTouchView | undefined;
}

export interface DocsNodeRowView {
  kind: 'node';
  name: string;
  anchor: string;
  edges: string[];
  pointers: string[];
}

export type DocsRowView = DocsPageRowView | DocsRecordRowView | DocsNodeRowView;

interface DocsGroupView {
  label: string;
  rows: DocsRowView[];
}

export interface DocsCatalogView {
  groups: DocsGroupView[];
}
