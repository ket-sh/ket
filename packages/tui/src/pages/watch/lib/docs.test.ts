import { describe, expect, it } from 'vitest';

import type { DocsCatalogView, DocsRowView } from '../../../shared/model';

import { catalogLines, catalogRows, detailLinesOf, detailRoomOf, rotWordOf } from './docs.ts';

const NOW = '2026-08-07T12:00:00.000Z';

const HANDBOOK: DocsRowView = {
  kind: 'page',
  path: 'docs/handbook.md',
  name: 'handbook',
  category: 'reference',
  sources: ['packages/cli/src/**'],
  rot: 'fresh',
  broken: undefined,
  touch: {
    by: 'Ada Lovelace',
    at: '2026-08-07T11:00:00.000Z',
    subject: 'docs: rewrite the tour (#70)',
  },
};

const UPGRADE: DocsRowView = {
  kind: 'page',
  path: 'docs/upgrade.md',
  name: 'upgrade',
  category: 'reference',
  sources: ['scripts/**'],
  rot: 'stale',
  broken: undefined,
  touch: undefined,
};

const WHY: DocsRowView = {
  kind: 'page',
  path: 'docs/why.md',
  name: 'why',
  category: 'explanation',
  sources: [],
  rot: 'unpinned',
  broken: undefined,
  touch: undefined,
};

const MANGLED: DocsRowView = {
  kind: 'page',
  path: 'docs/mangled.md',
  name: 'mangled',
  category: undefined,
  sources: [],
  rot: 'broken',
  broken: 'frontmatter sources must be a list',
  touch: undefined,
};

const RECORD: DocsRowView = {
  kind: 'record',
  path: 'docs/adr/0001-first-call.md',
  name: '0001-first-call',
  touch: undefined,
};

const NODE: DocsRowView = {
  kind: 'node',
  name: 'cli shared',
  anchor: 'cli-shared',
  edges: ['tui root'],
  pointers: ['Commands are islands'],
};

const LONELY: DocsRowView = {
  kind: 'node',
  name: 'tui root',
  anchor: 'tui-root',
  edges: [],
  pointers: [],
};

const CATALOG: DocsCatalogView = {
  groups: [
    { label: 'reference', rows: [HANDBOOK, UPGRADE] },
    { label: 'explanation', rows: [WHY] },
    { label: 'adr', rows: [RECORD] },
    { label: 'architecture', rows: [NODE, LONELY] },
  ],
};

describe('the rows the catalog flattens for the walk', () => {
  it('walks every group in shelf order', () => {
    expect(catalogRows(CATALOG).map((row) => row.name)).toStrictEqual([
      'handbook',
      'upgrade',
      'why',
      '0001-first-call',
      'cli shared',
      'tui root',
    ]);
  });

  it('threads headers between the rows and numbers the rows alone', () => {
    const lines = catalogLines(CATALOG);
    const headers = lines.flatMap((line) => (line.kind === 'header' ? [line.label] : []));
    const seats = lines.flatMap((line) => (line.kind === 'row' ? [line.at] : []));

    expect(headers).toStrictEqual(['reference', 'explanation', 'adr', 'architecture']);
    expect(seats).toStrictEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('the rot word a row wears', () => {
  it('keeps a fresh page, a record, and a node quiet', () => {
    expect(rotWordOf(HANDBOOK)).toBe('');
    expect(rotWordOf(RECORD)).toBe('');
    expect(rotWordOf(NODE)).toBe('');
  });

  it('names the stale, the unpinned, and the broken', () => {
    expect(rotWordOf(UPGRADE)).toBe('stale');
    expect(rotWordOf(WHY)).toBe('unpinned');
    expect(rotWordOf(MANGLED)).toBe('broken');
  });
});

describe('the detail lines a page answers', () => {
  it('tells the category, the stamp state, the sources, and the last touch', () => {
    expect(detailLinesOf(HANDBOOK, NOW)).toStrictEqual([
      { text: 'handbook', tone: 'key' },
      { text: 'docs/handbook.md', tone: 'quiet' },
      { text: 'category  reference', tone: 'state' },
      { text: 'fresh · the stamp covers the sources', tone: 'state' },
      { text: 'sources', tone: 'state' },
      { text: '  packages/cli/src/**', tone: 'quiet' },
      { text: 'touched 1h by Ada Lovelace', tone: 'quiet' },
      { text: 'docs: rewrite the tour (#70)', tone: 'quiet' },
    ]);
  });

  it('raises the alert once the sources moved past the stamp', () => {
    expect(detailLinesOf(UPGRADE, NOW)).toContainEqual({
      text: 'stale · the sources moved past the stamp',
      tone: 'alert',
    });
  });

  it('says unpinned out loud instead of hiding the exemption', () => {
    const lines = detailLinesOf(WHY, NOW);

    expect(lines).toContainEqual({ text: 'unpinned · no sources pinned', tone: 'quiet' });
    expect(lines).not.toContainEqual({ text: 'sources', tone: 'state' });
  });

  it('carries the breakage message on a broken row', () => {
    const lines = detailLinesOf(MANGLED, NOW);

    expect(lines).toContainEqual({
      text: 'broken · frontmatter sources must be a list',
      tone: 'alert',
    });
    expect(lines).toContainEqual({ text: 'category  none', tone: 'state' });
  });
});

describe('the detail lines the other rows answer', () => {
  it('reads a record as a decision that never rots', () => {
    expect(detailLinesOf(RECORD, NOW)).toStrictEqual([
      { text: '0001-first-call', tone: 'key' },
      { text: 'docs/adr/0001-first-call.md', tone: 'quiet' },
      { text: 'a decision record · never rots', tone: 'state' },
    ]);
  });

  it('reads a node through its edges and the intent pointing at it', () => {
    expect(detailLinesOf(NODE, NOW)).toStrictEqual([
      { text: 'cli shared', tone: 'key' },
      { text: 'architecture node', tone: 'quiet' },
      { text: 'depends on', tone: 'state' },
      { text: '  tui root', tone: 'quiet' },
      { text: 'intent', tone: 'state' },
      { text: '  Commands are islands', tone: 'quiet' },
    ]);
  });

  it('says so when a node stands alone', () => {
    const lines = detailLinesOf(LONELY, NOW);

    expect(lines).toContainEqual({ text: '  nothing inside the workspace', tone: 'quiet' });
    expect(lines).toContainEqual({ text: '  no intent anchors point here', tone: 'quiet' });
  });

  it('says nothing is chosen over an empty catalog', () => {
    expect(detailLinesOf(undefined, NOW)).toStrictEqual([
      { text: 'nothing chosen', tone: 'quiet' },
    ]);
  });
});

describe('the room the detail pane takes', () => {
  it('takes a third of the width, held between 28 and 48 columns', () => {
    expect(detailRoomOf(200)).toBe(48);
    expect(detailRoomOf(90)).toBe(30);
    expect(detailRoomOf(60)).toBe(28);
  });
});
