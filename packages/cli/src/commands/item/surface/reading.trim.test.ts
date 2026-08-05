import { describe, expect, it } from 'vitest';

import { readingLayout } from './reading.ts';

describe('the edges the reading layout shaves', () => {
  it('shaves the trailing spaces off a quoted summary', () => {
    const page = readingLayout('# The title\n\n> The tail  \n');

    expect(page).toContain('<p class="tldr-body">The tail</p>');
  });

  it('shaves the trailing spaces off a cost strip', () => {
    const page = readingLayout(
      '# The title\n\n## Alternatives\n\n### One\n\nCost: The price  \n\nBody.\n',
    );

    expect(page).toContain('<span class="alt-cost-label">Cost</span><span>The price</span>');
  });

  it('shaves the padding off a section heading', () => {
    const page = readingLayout('# The padded title  \n\n> Short.\n');

    expect(page).toContain('The padded title</h2>');
  });
});
