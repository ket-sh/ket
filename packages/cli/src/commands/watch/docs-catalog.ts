import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DocsRot, SourceEntry } from '../../shared/docs-stamp.ts';

import { architectureNodesOf, intentPointersOf } from '../../shared/docs-architecture.ts';
import { DOC_CATEGORIES, isDocCategory, parsePage } from '../../shared/docs-frontmatter.ts';
import { adrDocPages, governedDocPages } from '../../shared/docs-pages.ts';
import { matchedSourcesOf, rotOf } from '../../shared/docs-stamp.ts';
import { gitSaid } from '../../shared/git.ts';

interface DocsTouch {
  by: string;
  at: string;
  subject: string;
}

export interface DocsPageRow {
  kind: 'page';
  path: string;
  name: string;
  category: string | undefined;
  sources: string[];
  rot: DocsRot | 'broken';
  broken: string | undefined;
  touch: DocsTouch | undefined;
}

interface DocsRecordRow {
  kind: 'record';
  path: string;
  name: string;
  touch: DocsTouch | undefined;
}

interface DocsNodeRow {
  kind: 'node';
  name: string;
  anchor: string;
  edges: string[];
  pointers: string[];
}

type DocsRow = DocsPageRow | DocsRecordRow | DocsNodeRow;

interface DocsGroup {
  label: string;
  rows: DocsRow[];
}

export interface DocsCatalog {
  groups: DocsGroup[];
}

const DOCS_PREFIX = 'docs/';

const ADR_PREFIX = 'docs/adr/';

const PAGE_SUFFIX = '.md';

const SKELETON_PATH = 'docs/architecture/skeleton.md';

const INTENT_PATH = 'docs/architecture/intent.md';

const UNCATEGORIZED = 'uncategorized';

function nameOf(path: string, prefix: string): string {
  return path.slice(prefix.length, -PAGE_SUFFIX.length);
}

function touchFrom(said: string): DocsTouch | undefined {
  const [by, at, subject] = said.split('\n');

  return by === undefined || at === undefined || subject === undefined
    ? undefined
    : { by, at, subject };
}

async function lastTouchOf(root: string, path: string): Promise<DocsTouch | undefined> {
  const said = await gitSaid(['log', '-1', '--format=%an%n%aI%n%s', '--', path], root);

  return said === undefined ? undefined : touchFrom(said);
}

async function entriesOf(root: string, matched: readonly string[]): Promise<SourceEntry[]> {
  return Promise.all(
    matched.map(async (path) => ({ path, content: await readFile(join(root, path), 'utf8') })),
  );
}

interface PageHealth {
  category: string | undefined;
  sources: string[];
  rot: DocsRot | 'broken';
  broken: string | undefined;
}

async function healthOf(root: string, path: string, files: readonly string[]): Promise<PageHealth> {
  const page = parsePage(await readFile(join(root, path), 'utf8'));
  const worn = { category: page.category, sources: page.sources };

  if (page.sources.length === 0) {
    return { ...worn, rot: 'unpinned', broken: undefined };
  }

  const sources = matchedSourcesOf(files, page.sources);

  if ('refused' in sources) {
    return { ...worn, rot: 'broken', broken: sources.refused };
  }

  return { ...worn, rot: rotOf(page, await entriesOf(root, sources.matched)), broken: undefined };
}

function brokenHealth(broke: unknown): PageHealth {
  return {
    category: undefined,
    sources: [],
    rot: 'broken',
    broken: broke instanceof Error ? broke.message : String(broke),
  };
}

async function pageRowOf(
  root: string,
  path: string,
  files: readonly string[],
): Promise<DocsPageRow> {
  const [health, touch] = await Promise.all([
    healthOf(root, path, files).catch((broke: unknown) => brokenHealth(broke)),
    lastTouchOf(root, path),
  ]);

  return { kind: 'page', path, name: nameOf(path, DOCS_PREFIX), ...health, touch };
}

function categoryLabelOf(row: DocsPageRow): string {
  return isDocCategory(row.category) ? (row.category ?? UNCATEGORIZED) : UNCATEGORIZED;
}

function pageGroups(rows: DocsPageRow[]): DocsGroup[] {
  return [...DOC_CATEGORIES, UNCATEGORIZED]
    .map((label) => ({ label, rows: rows.filter((row) => categoryLabelOf(row) === label) }))
    .filter((group) => group.rows.length > 0);
}

async function recordRowsOf(root: string, files: readonly string[]): Promise<DocsRecordRow[]> {
  return Promise.all(
    adrDocPages(files).map(async (path) => ({
      kind: 'record' as const,
      path,
      name: nameOf(path, ADR_PREFIX),
      touch: await lastTouchOf(root, path),
    })),
  );
}

async function readTracked(
  root: string,
  files: readonly string[],
  path: string,
): Promise<string | undefined> {
  if (!files.includes(path)) {
    return undefined;
  }

  return readFile(join(root, path), 'utf8').catch(() => undefined);
}

async function nodeRowsOf(root: string, files: readonly string[]): Promise<DocsNodeRow[]> {
  const skeleton = await readTracked(root, files, SKELETON_PATH);

  if (skeleton === undefined) {
    return [];
  }

  const intent = await readTracked(root, files, INTENT_PATH);
  const pointers = intent === undefined ? [] : intentPointersOf(intent);

  return architectureNodesOf(skeleton).map((node) => ({
    kind: 'node' as const,
    name: node.label,
    anchor: node.anchor,
    edges: node.edges,
    pointers: pointers
      .filter((pointer) => pointer.anchor === node.anchor)
      .map((pointer) => pointer.section),
  }));
}

function shelved(label: string, rows: DocsRow[]): DocsGroup[] {
  return rows.length === 0 ? [] : [{ label, rows }];
}

export async function docsCatalogFor(root: string): Promise<DocsCatalog> {
  const said = await gitSaid(['ls-files'], root);

  if (said === undefined) {
    return { groups: [] };
  }

  const files = said.split('\n');
  const [pages, records, nodes] = await Promise.all([
    Promise.all(governedDocPages(files).map(async (path) => pageRowOf(root, path, files))),
    recordRowsOf(root, files),
    nodeRowsOf(root, files),
  ]);

  return {
    groups: [...pageGroups(pages), ...shelved('adr', records), ...shelved('architecture', nodes)],
  };
}
