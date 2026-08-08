import { describe, expect, it } from 'vitest';

import { governedDocPages } from './pages.mts';

const tracked = [
  'README.md',
  'docs/handbook.md',
  'docs/glossary.md',
  'docs/architecture/skeleton.md',
  'docs/adr/0001-surface-writes-artifacts-never-status.md',
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
