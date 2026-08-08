import { readFileSync } from 'node:fs';

import type { DocPage } from '../../packages/cli/src/shared/docs-frontmatter.ts';
import type { SourceEntry } from '../../packages/cli/src/shared/docs-stamp.ts';

import { parsePage } from '../../packages/cli/src/shared/docs-frontmatter.ts';
import { matchedSourcesOf, rotOf, stampOf } from '../../packages/cli/src/shared/docs-stamp.ts';

export interface PinnedPage {
  path: string;
  page: DocPage;
  matched: string[];
  expected: string;
}

export type PageState =
  | { kind: 'unpinned'; path: string }
  | { kind: 'fresh'; path: string }
  | { kind: 'stale'; pinned: PinnedPage };

export function readSources(files: readonly string[], globs: readonly string[]): string[] {
  const sources = matchedSourcesOf(files, globs);

  if ('refused' in sources) {
    throw new Error(sources.refused);
  }

  return sources.matched;
}

function entriesOf(matched: readonly string[]): SourceEntry[] {
  return matched.map((path) => ({ path, content: readFileSync(path, 'utf-8') }));
}

export function pageState(path: string, files: readonly string[]): PageState {
  const page = parsePage(readFileSync(path, 'utf-8'));

  if (page.sources.length === 0) {
    return { kind: 'unpinned', path };
  }

  const matched = readSources(files, page.sources);
  const entries = entriesOf(matched);

  if (rotOf(page, entries) === 'fresh') {
    return { kind: 'fresh', path };
  }

  return { kind: 'stale', pinned: { path, page, matched, expected: stampOf(entries) } };
}
