import { describe, expect, it } from 'vitest';

import { adrDocPages, governedDocPages } from './docs-pages.ts';

const tracked = [
  'README.md',
  'docs/handbook.md',
  'docs/glossary.md',
  'docs/architecture/skeleton.md',
  'docs/adr/0002-surface-dependency-set.md',
  'docs/adr/0001-surface-writes-artifacts-never-status.md',
  'docs/adr/notes.txt',
  'docs/pipeline.png',
  'docs/superpowers/specs/2026-08-08-docs-discipline-design.md',
  'packages/cli/src/main.ts',
];

describe('governed doc pages', () => {
  it('given the tracked files, then only docs pages outside the records fall under the gates', () => {
    expect(governedDocPages(tracked)).toEqual([
      'docs/architecture/skeleton.md',
      'docs/glossary.md',
      'docs/handbook.md',
    ]);
  });
});

describe('the records shelf', () => {
  it('given the tracked files, then only the ADR pages come back, sorted', () => {
    expect(adrDocPages(tracked)).toEqual([
      'docs/adr/0001-surface-writes-artifacts-never-status.md',
      'docs/adr/0002-surface-dependency-set.md',
    ]);
  });

  it('given no ADR directory at all, then the shelf is empty', () => {
    expect(adrDocPages(['docs/handbook.md', 'README.md'])).toEqual([]);
  });
});
