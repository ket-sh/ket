import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

const RECORDED = `# Retune the brand pair to cobalt

Status: accepted
Date: 2026-08-04
`;

const TAINTED = `# Retune the brand pair to cobalt

Status: <b>done & dusted
`;

const BARE = `# Retune the brand pair to cobalt

Status:
`;

const SUMMARIZED = `# Retune the brand pair to cobalt

> **TL;DR** The summary spans
> two quoted lines.
`;

const TIGHT = `# Retune the brand pair to cobalt

>**TL;DR** The opener needs no space after the marker.
`;

const HOLLOW = '# Retune the brand pair to cobalt\n\n>  \n';

const INDENTED = '# Retune the brand pair to cobalt\n\n  Status: accepted\n\nProse stays.\n';

const MENTIONED = `# Retune the brand pair to cobalt

The ledger keeps Status: accepted for the record.
`;

const MIDSTREAM = `# Retune the brand pair to cobalt

> Keep **TL;DR** as words when it lands mid-sentence.
`;

const HUGGING = `# Retune the brand pair to cobalt

> **TL;DR**The label hugs the words.
`;

const PARAGRAPHED = `# Retune the brand pair to cobalt

The first thought.

The second thought.
`;

const BADGE_ROW =
  '<p class="badge-row">' +
  '<span class="badge badge-status"><span class="badge-label">Status</span><span class="badge-value">accepted</span></span>' +
  '<span class="badge badge-date"><span class="badge-label">Date</span><span class="badge-value">2026-08-04</span></span>' +
  '</p>';

describe('the badge row of a decision record', () => {
  it('reads a date line as a badge wearing the date class', () => {
    expect(readingLayout(RECORDED)).toContain('<span class="badge badge-date">');
  });

  it('seats every badge side by side in one row', () => {
    expect(readingLayout(RECORDED)).toContain(BADGE_ROW);
  });

  it('renders a hostile badge value as text, never as markup', () => {
    const rendered = readingLayout(TAINTED);

    expect(rendered).toContain('<span class="badge-value">&lt;b&gt;done &amp; dusted</span>');
    expect(rendered).not.toContain('<b>');
  });

  it('leaves a status line without a value in the prose', () => {
    const rendered = readingLayout(BARE);

    expect(rendered).toContain('<p>Status:</p>');
    expect(rendered).not.toContain('badge-row');
  });

  it('reads an indented status line as a badge all the same', () => {
    const rendered = readingLayout(INDENTED);

    expect(rendered).toContain('<span class="badge-value">accepted</span>');
    expect(rendered).not.toContain('<p>Status: accepted</p>');
  });

  it('leaves a status mentioned mid-sentence in the prose', () => {
    const rendered = readingLayout(MENTIONED);

    expect(rendered).toContain('<p>The ledger keeps Status: accepted for the record.</p>');
    expect(rendered).not.toContain('badge-row');
  });
});

describe('the summary callout of a reading layout', () => {
  it('joins the quoted lines into one sentence with single spaces', () => {
    expect(readingLayout(SUMMARIZED)).toContain(
      '<p class="tldr-body">The summary spans two quoted lines.</p>',
    );
  });

  it('reads a quote whose marker hugs its text', () => {
    expect(readingLayout(TIGHT)).toContain(
      '<p class="tldr-body">The opener needs no space after the marker.</p>',
    );
  });

  it('reads a quote holding only space as no summary written', () => {
    expect(readingLayout(HOLLOW)).toContain('<aside class="tldr is-missing">');
  });

  it('keeps the label word when it lands inside the summary', () => {
    expect(readingLayout(MIDSTREAM)).toContain(
      '<p class="tldr-body">Keep <strong>TL;DR</strong> as words when it lands mid-sentence.</p>',
    );
  });

  it('drops the label even when it hugs the summary', () => {
    expect(readingLayout(HUGGING)).toContain('<p class="tldr-body">The label hugs the words.</p>');
  });
});

describe('the intro prose of a reading layout', () => {
  it('keeps the intro paragraphs apart', () => {
    const rendered = readingLayout(PARAGRAPHED);

    expect(rendered).toContain('<p>The first thought.</p>');
    expect(rendered).toContain('<p>The second thought.</p>');
  });
});
