import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

const SUMMARIZED = `# Retune the brand pair to cobalt

> **TL;DR** Moves the brand pair to cobalt hue 257 in both schemes and deletes
> five tokens the removed hero orphaned.

The spec records that no ADR is owed, because this chore adopts no library.
`;

const NO_SUMMARY = `# Retune the brand pair to cobalt

The spec records that no ADR is owed, because this chore adopts no library.
`;

const RECORDED = `# Retune the brand pair to cobalt

Status: accepted
Date: 2026-08-04

The record holds the judgment the file cannot make for itself.
`;

const ORDERED = `# The gate surfaces

## How the page assembles

### 1. Read the artifacts beside the item

Every file arrives as text.

### 2. Group the panels into sections

A section owns its panels.
`;

const CONSEQUENCES = `# The gate surfaces

## Consequences

### Good

The reviewer reads one page.

### Bad

The page needs the d2 binary.
`;

const ALTERNATIVES = `# The gate surfaces

## Alternatives

### Adopt the system blue anchor verbatim

The system blue is the product's own accent.

Cost: every token name moves, so the scaffold rewrites its palette.
`;

const HOSTILE = `# The gate surfaces

An agent wrote <script>fetch('/artifact')</script> into this document.
`;

const WITH_PATH = `# The gate surfaces

The assembly lives in \`packages/cli/src/commands/item/surface/page.ts\`.
`;

describe('the reading layout an artifact renders as', () => {
  it('reads the document heading as the title of the layout', () => {
    expect(readingLayout(SUMMARIZED)).toContain(
      '<h2 class="reading-title">Retune the brand pair to cobalt</h2>',
    );
  });

  it('lifts the summary quote into the callout the eye lands on first', () => {
    const rendered = readingLayout(SUMMARIZED);

    expect(rendered).toContain('<aside class="tldr">');
    expect(rendered).toContain('Moves the brand pair to cobalt hue 257 in both schemes');
  });

  it('drops the TL;DR label out of the callout it introduces', () => {
    expect(readingLayout(SUMMARIZED)).not.toContain('<strong>TL;DR</strong>');
  });

  it('renders the quiet empty callout for a document without a summary', () => {
    const rendered = readingLayout(NO_SUMMARY);

    expect(rendered).toContain('<aside class="tldr is-missing">');
    expect(rendered).toContain('No summary written.');
  });

  it('keeps the prose under the callout out of the callout', () => {
    expect(readingLayout(SUMMARIZED)).toContain(
      '<p>The spec records that no ADR is owed, because this chore adopts no library.</p>',
    );
  });

  it('renders nothing at all for an artifact nobody has written yet', () => {
    expect(readingLayout('   \n')).toBe('');
  });
});

describe('the reading layout of a decision record', () => {
  it('reads a status line as a badge instead of a paragraph', () => {
    const rendered = readingLayout(RECORDED);

    expect(rendered).toContain('<span class="badge badge-status">');
    expect(rendered).toContain('accepted');
    expect(rendered).not.toContain('<p>Status: accepted');
  });

  it('renders a run of numbered subsections as a numbered column', () => {
    const rendered = readingLayout(ORDERED);

    expect(rendered).toContain('<ol class="step-cards">');
    expect(rendered).toContain('<span class="step-number">1</span>');
    expect(rendered).toContain('<span class="step-number">2</span>');
    expect(rendered).toContain('Read the artifacts beside the item');
  });

  it('names the step by its heading with the number lifted out of it', () => {
    expect(readingLayout(ORDERED)).toContain(
      '<h4 class="step-head">Group the panels into sections</h4>',
    );
  });

  it('renders a good and bad pair as two consequence columns', () => {
    const rendered = readingLayout(CONSEQUENCES);

    expect(rendered).toContain('<article class="consequence consequence-good">');
    expect(rendered).toContain('<article class="consequence consequence-bad">');
  });

  it('lifts the cost of an alternative out of its prose and onto a strip', () => {
    const rendered = readingLayout(ALTERNATIVES);

    expect(rendered).toContain('<span class="alt-cost-label">Cost</span>');
    expect(rendered).toContain('every token name moves, so the scaffold rewrites its palette.');
    expect(rendered).not.toContain('<p>Cost:');
  });
});

describe('the reading layout of untrusted prose', () => {
  it('renders markup an artifact carries as text, never as markup', () => {
    const rendered = readingLayout(HOSTILE);

    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
  });

  it('marks a path in code as a chip, so a reader sees it is a file', () => {
    expect(readingLayout(WITH_PATH)).toContain(
      '<span class="chip">packages/cli/src/commands/item/surface/page.ts</span>',
    );
  });
});
