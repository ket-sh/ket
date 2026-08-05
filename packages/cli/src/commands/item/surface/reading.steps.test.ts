import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

const PARENTHESIZED = `# The gate surfaces

## How the page assembles

### 1) Read the artifacts

Every file arrives as text.

### 2) Group the panels

A section owns its panels.
`;

const MIXED = `# The gate surfaces

## How the page assembles

### 1. Read the artifacts

Every file arrives as text.

### Group the panels

A section owns its panels.
`;

const GLUED = `# The gate surfaces

## How the page assembles

### 1.Read the artifacts

Every file arrives as text.
`;

const MENTIONED = `# The gate surfaces

## How the page assembles

### Step 1. Read the artifacts

Every file arrives as text.
`;

const RENUMBERED = `# The gate surfaces

## How the page assembles

### 12) Cut the panel run

Every file arrives as text.
`;

const SPANNING = `# The gate surfaces

## Alternatives

### Keep the current pair

Cost: the palette stays split
across both schemes.

After the blank line the prose resumes.
`;

const FRONTED = `# The gate surfaces

## Alternatives

### Keep the current pair
Leading prose right under the heading.

Cost: nothing moves.
`;

const INDENTED =
  '# The gate surfaces\n\n## Alternatives\n\n### Keep the current pair\n\n  Cost: the run bends\n  around the indent.\n\nAfter the run the prose resumes.\n\nAnd a second thought follows.\n';

const SPACED =
  '# The gate surfaces\n\n## Alternatives\n\n### Keep the current pair\n\nCost: the run stops\n   \nAfter the spaced line the prose resumes.\n';

const FREE = `# The gate surfaces

## Alternatives

### Keep the current pair

Nothing here costs anything.
`;

const SHOUTED = `# The gate surfaces

## Consequences

### GOOD

The reviewer reads one page.

### bad

The page needs the d2 binary.
`;

const TRIPLED = `# The gate surfaces

## Consequences

### Good

The reviewer reads one page.

### Bad

The page needs the d2 binary.

### Ugly

The wart stays visible.
`;

const UNPAIRED = `# The gate surfaces

## Consequences

### Good

The reviewer reads one page.

### Ugly

The wart stays visible.
`;

const LONE = `# The gate surfaces

## Consequences

### Good

The reviewer reads one page.
`;

describe('the numbered steps of a section', () => {
  it('reads a parenthesized number like a dotted one', () => {
    const rendered = readingLayout(PARENTHESIZED);

    expect(rendered).toContain('<ol class="step-cards">');
    expect(rendered).toContain('<span class="step-number">1</span>');
  });

  it('seats the steps side by side in one run', () => {
    expect(readingLayout(PARENTHESIZED)).toContain(
      '</div></li><li class="step-card"><span class="step-number">2</span>',
    );
  });

  it('falls back to plain cards when one subsection breaks the numbering', () => {
    const rendered = readingLayout(MIXED);

    expect(rendered).not.toContain('step-card');
    expect(rendered).toContain('<h4 class="alt-card-head">1. Read the artifacts</h4>');
    expect(rendered).toContain(
      '</div></article><article class="alt-card"><h4 class="alt-card-head">Group the panels</h4>',
    );
  });

  it('reads a number glued to its heading as a name, not a step', () => {
    const rendered = readingLayout(GLUED);

    expect(rendered).not.toContain('step-card');
    expect(rendered).toContain('<h4 class="alt-card-head">1.Read the artifacts</h4>');
  });

  it('reads a heading that only mentions a number as an alternative', () => {
    const rendered = readingLayout(MENTIONED);

    expect(rendered).not.toContain('step-card');
    expect(rendered).toContain('<h4 class="alt-card-head">Step 1. Read the artifacts</h4>');
  });

  it('keeps a two-digit step number whole', () => {
    expect(readingLayout(RENUMBERED)).toContain('<span class="step-number">12</span>');
  });
});

describe('the cost strip of an alternative', () => {
  it('folds a cost spanning two lines into one strip', () => {
    expect(readingLayout(SPANNING)).toContain(
      '<span class="alt-cost-label">Cost</span><span>the palette stays split across both schemes.</span>',
    );
  });

  it('ends the cost run at the first blank line', () => {
    expect(readingLayout(SPANNING)).toContain('<p>After the blank line the prose resumes.</p>');
  });

  it('keeps the prose that opens an alternative out of its strip', () => {
    const rendered = readingLayout(FRONTED);

    expect(rendered).toContain('<p>Leading prose right under the heading.</p>');
    expect(rendered).toContain(
      '<span class="alt-cost-label">Cost</span><span>nothing moves.</span>',
    );
  });

  it('spares an alternative without a cost the strip', () => {
    expect(readingLayout(FREE)).not.toContain('alt-cost');
  });

  it('reads an indented cost run without carrying the indent along', () => {
    const rendered = readingLayout(INDENTED);

    expect(rendered).toContain(
      '<span class="alt-cost-label">Cost</span><span>the run bends around the indent.</span>',
    );
    expect(rendered).toContain('<p>After the run the prose resumes.</p>');
    expect(rendered).toContain('<p>And a second thought follows.</p>');
  });

  it('ends the cost run at a line holding only space', () => {
    const rendered = readingLayout(SPACED);

    expect(rendered).toContain(
      '<span class="alt-cost-label">Cost</span><span>the run stops</span>',
    );
    expect(rendered).toContain('<p>After the spaced line the prose resumes.</p>');
  });
});

describe('the consequence columns of a record', () => {
  it('hears a shouted good column and seats it in the good strip', () => {
    const rendered = readingLayout(SHOUTED);

    expect(rendered).toContain(
      '<article class="consequence consequence-good"><h4 class="consequence-head">GOOD</h4>',
    );
    expect(rendered).toContain('</article><article class="consequence consequence-bad">');
  });

  it('refuses a third column and falls back to plain cards', () => {
    const rendered = readingLayout(TRIPLED);

    expect(rendered).not.toContain('<div class="consequences">');
    expect(rendered).toContain('<div class="alt-cards">');
  });

  it('refuses a pair where only one column passes judgment', () => {
    const rendered = readingLayout(UNPAIRED);

    expect(rendered).not.toContain('<div class="consequences">');
    expect(rendered).toContain('<div class="alt-cards">');
  });

  it('refuses a lone good column the pair treatment', () => {
    const rendered = readingLayout(LONE);

    expect(rendered).not.toContain('<div class="consequences">');
    expect(rendered).toContain('<div class="alt-cards">');
  });
});
