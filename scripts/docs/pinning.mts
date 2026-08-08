import { readFileSync } from 'node:fs';

import type { DocPage } from './frontmatter.mts';

import { parsePage } from './frontmatter.mts';
import { sourcesOf, stampOf } from './stamp.mts';

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
  const matched = sourcesOf(files, globs);

  if (matched.length === 0) {
    throw new Error(`the sources list matches no tracked file: ${globs.join(', ')}`);
  }

  return matched;
}

function expectedStamp(matched: readonly string[]): string {
  return stampOf(matched.map((path) => ({ path, content: readFileSync(path, 'utf-8') })));
}

export function pageState(path: string, files: readonly string[]): PageState {
  const page = parsePage(readFileSync(path, 'utf-8'));

  if (page.sources.length === 0) {
    return { kind: 'unpinned', path };
  }

  const matched = readSources(files, page.sources);
  const expected = expectedStamp(matched);

  if (page.stamp === expected) {
    return { kind: 'fresh', path };
  }

  return { kind: 'stale', pinned: { path, page, matched, expected } };
}
