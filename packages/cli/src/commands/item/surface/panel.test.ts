import { describe, expect, it } from 'vitest';

import { masonry, panelOf } from './panel.ts';

describe('the bricks a section lays', () => {
  it('widens a lone panel to the full row', () => {
    const laid = masonry([panelOf('Design', '<p>short</p>')]);

    expect(laid).toContain('gs-w="12"');
  });

  it('seats two column panels side by side', () => {
    const laid = masonry([panelOf('Design', '<p>a</p>'), panelOf('Diagram', '<p>b</p>')]);

    expect(laid).toContain('gs-x="0"');
    expect(laid).toContain('gs-x="6"');
  });

  it('frames a collapsible panel as an open details', () => {
    const laid = masonry([
      panelOf('Diagram', '<svg></svg>', { frame: 'collapsible' }),
      panelOf('Design', '<p>a</p>'),
    ]);

    expect(laid).toContain('<details');
    expect(laid).toContain('open>');
  });

  it('says what was never written inside the panel body', () => {
    expect(masonry([panelOf('Findings', '')])).toContain('Not written at this stage.');
  });
});
