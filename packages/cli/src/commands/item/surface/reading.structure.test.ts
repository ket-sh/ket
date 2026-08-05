import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

const UNTITLED = 'A page nobody gave a heading.\n';

const GLUED_MARKER = '#Heading\n\nBody under a heading that never opened.\n';

const TITLED = '# Title\n';

const QUIET_PAGE = `<div class="reading">
<h2 class="reading-title">Title</h2>

<aside class="tldr is-missing"><p class="tldr-label">TL;DR</p><p class="tldr-body">No summary written.</p></aside>


</div>`;

const SECTIONED = `# The gate surfaces

## First section

The first body.

## Second section

The second body.
`;

const PUNCTUATED = `# The gate surfaces

## (Weighing) the cost?

The scale tips.
`;

const BLANK_SECTION = '# The gate surfaces\n\n## Notes\n   ';

const WITH_CODE = `# The gate surfaces

Run \`bunx\` inside \`packages/cli\` before touching \`reading.ts\`.

Ship \`v1.2 beta\` before the freeze.
`;

describe('the shape of a page without structure', () => {
  it('renders a source without any heading as plain prose', () => {
    expect(readingLayout(UNTITLED)).toBe(
      '<div class="prose"><p>A page nobody gave a heading.</p>\n</div>',
    );
  });

  it('refuses a heading whose marker hugs its text', () => {
    expect(readingLayout(GLUED_MARKER)).toBe(
      '<div class="prose"><p>#Heading</p>\n<p>Body under a heading that never opened.</p>\n</div>',
    );
  });

  it('renders a bare title as the quiet page', () => {
    expect(readingLayout(TITLED)).toBe(QUIET_PAGE);
  });
});

describe('the sections of a structured page', () => {
  it('keeps each body under the section that opened it', () => {
    expect(readingLayout(SECTIONED)).toContain(
      '<article class="read-card read-card-first-section"><h3 class="read-card-head">First section</h3><div class="prose"><p>The first body.</p>\n</div></article><article class="read-card read-card-second-section">',
    );
  });

  it('slugs a section name down to its letters', () => {
    expect(readingLayout(PUNCTUATED)).toContain(
      '<article class="read-card read-card-weighing-the-cost">',
    );
  });

  it('renders a section with nothing under it as just its head', () => {
    expect(readingLayout(BLANK_SECTION)).toContain(
      '<article class="read-card read-card-notes"><h3 class="read-card-head">Notes</h3></article>',
    );
  });
});

describe('the chips the prose wears', () => {
  it('marks a slashed path without an extension as a chip', () => {
    expect(readingLayout(WITH_CODE)).toContain('<span class="chip">packages/cli</span>');
  });

  it('marks a bare file name by its extension', () => {
    expect(readingLayout(WITH_CODE)).toContain('<span class="chip">reading.ts</span>');
  });

  it('leaves a plain command in its code dress', () => {
    expect(readingLayout(WITH_CODE)).toContain('<code>bunx</code>');
  });

  it('leaves a version note in its code dress, dot and all', () => {
    expect(readingLayout(WITH_CODE)).toContain('<code>v1.2 beta</code>');
  });
});
