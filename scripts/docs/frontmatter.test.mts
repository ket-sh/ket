import { describe, expect, it } from 'vitest';

import { isDocCategory, parsePage, stampedPage } from './frontmatter.mts';

const page = [
  '---',
  'category: reference',
  'sources:',
  '  - packages/cli/src/**',
  '  - harness/**',
  'stamp: abc123def456',
  '---',
  '',
  '# A page',
  '',
  'Body text.',
  '',
].join('\n');

describe('the page frontmatter codec', () => {
  it('given a stamped page, then category, sources, and stamp come through', () => {
    const parsed = parsePage(page);

    expect(parsed.category).toBe('reference');
    expect(parsed.sources).toEqual(['packages/cli/src/**', 'harness/**']);
    expect(parsed.stamp).toBe('abc123def456');
  });

  it('given a page without frontmatter, then it reads as unpinned and uncategorized', () => {
    const parsed = parsePage('# Bare page\n');

    expect(parsed.category).toBeUndefined();
    expect(parsed.sources).toEqual([]);
    expect(parsed.stamp).toBeUndefined();
  });

  it('given frontmatter without sources, then the page is unpinned', () => {
    expect(parsePage('---\ncategory: explanation\n---\n\n# Page\n').sources).toEqual([]);
  });

  it('given a sources entry that is not a list item, then parsing fails naming the key', () => {
    expect(() => parsePage('---\nsources: everywhere\n---\n')).toThrow(/sources/u);
  });
});

describe('stamping a page', () => {
  it('given a page with a stamp, then restamping replaces the stamp and nothing else', () => {
    const restamped = stampedPage(page, 'fedcba987654');

    expect(restamped).toBe(page.replace('stamp: abc123def456', 'stamp: fedcba987654'));
  });

  it('given a page without a stamp, then the stamp lands before the closing fence', () => {
    const bare = '---\ncategory: reference\nsources:\n  - harness/**\n---\n\n# Page\n';
    const stamped = stampedPage(bare, 'abc123def456');

    expect(stamped).toBe(
      '---\ncategory: reference\nsources:\n  - harness/**\nstamp: abc123def456\n---\n\n# Page\n',
    );
  });

  it('given a page without frontmatter, then stamping refuses', () => {
    expect(() => stampedPage('# Bare page\n', 'abc123def456')).toThrow(/frontmatter/u);
  });
});

describe('doc categories', () => {
  it('given the four category names, then each one passes', () => {
    for (const category of ['tutorial', 'how-to', 'reference', 'explanation']) {
      expect(isDocCategory(category)).toBe(true);
    }
  });

  it('given anything else, then it refuses', () => {
    expect(isDocCategory('guide')).toBe(false);
    expect(isDocCategory(undefined)).toBe(false);
  });
});
