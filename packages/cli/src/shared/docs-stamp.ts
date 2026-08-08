import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import type { DocPage } from './docs-frontmatter.ts';

export interface SourceEntry {
  path: string;
  content: string;
}

export type DocsRot = 'fresh' | 'stale' | 'unpinned';

export function byBytes(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function globToPattern(glob: string): RegExp {
  const escaped = glob.replaceAll(/[.+^${}()|[\]\\]/gu, '\\$&');
  const pattern = escaped.replaceAll('**', ' ').replaceAll('*', '[^/]*').replaceAll(' ', '.*');

  return new RegExp(`^${pattern}$`);
}

export function sourcesOf(files: readonly string[], globs: readonly string[]): string[] {
  const patterns = globs.map(globToPattern);
  const matched = files.filter((file) => patterns.some((pattern) => pattern.test(file)));

  return [...new Set(matched)].sort(byBytes);
}

export function matchedSourcesOf(
  files: readonly string[],
  globs: readonly string[],
): { matched: string[] } | { refused: string } {
  const matched = sourcesOf(files, globs);

  if (matched.length === 0) {
    return { refused: `the sources list matches no tracked file: ${globs.join(', ')}` };
  }

  return { matched };
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function stampOf(entries: readonly SourceEntry[]): string {
  const manifest = [...entries]
    .sort((left, right) => byBytes(left.path, right.path))
    .map((entry) => `${entry.path} ${sha256(entry.content)}`)
    .join('\n');

  return sha256(manifest).slice(0, 12);
}

export function rotOf(page: DocPage, entries: readonly SourceEntry[]): DocsRot {
  if (page.sources.length === 0) {
    return 'unpinned';
  }

  return page.stamp === stampOf(entries) ? 'fresh' : 'stale';
}
