import { describe, expect, it } from 'vitest';

import { masonry, panelOf } from './panel.ts';

describe('the markup one panel wears', () => {
  it('dresses a plain panel exactly', () => {
    expect(masonry([panelOf('Spec Sheet', '<p>x</p>')])).toBe(
      '<div class="grid-stack"><div class="grid-stack-item" gs-id="spec-sheet" gs-x="0" gs-y="0" gs-w="12" gs-h="24" gs-min-w="6" gs-min-h="4"><div class="grid-stack-item-content"><div class="panel is-full is-content" data-panel="spec-sheet"><div class="panel-head"><span class="panel-label">Spec Sheet</span><span class="panel-tools"></span></div><div class="panel-body"><p>x</p></div></div></div></div></div>',
    );
  });

  it('slugs a rough label down to dashed words', () => {
    const page = masonry([panelOf('  The  Panel! Two  ', '<p>x</p>')]);

    expect(page).toContain('gs-id="the-panel-two"');
    expect(page).toContain('data-panel="the-panel-two"');
  });

  it('hangs the hook classes after the shape', () => {
    const page = masonry([panelOf('Hooked', '<p>x</p>', { hook: 'panel-extra' })]);

    expect(page).toContain('class="panel is-full is-content panel-extra"');
  });

  it('folds a collapsible panel inside an open details', () => {
    const page = masonry([panelOf('Diagram', '<svg></svg>', { frame: 'collapsible' })]);

    expect(page).toContain(
      '<details class="panel is-full is-content panel-collapsible" data-panel="diagram" open><summary class="panel-head">',
    );
    expect(page).toContain('</details>');
  });

  it('pads an unwritten body, and cushions it inside a flush panel', () => {
    const padded = masonry([panelOf('Empty', '')]);
    const flush = masonry([panelOf('Empty', '', { inset: 'flush' })]);

    expect(padded).toContain(
      '<div class="panel-body"><p class="unwritten">Not written at this stage.</p></div>',
    );
    expect(flush).toContain(
      '<div class="panel-body is-flush"><div class="unwritten-pad"><p class="unwritten">Not written at this stage.</p></div></div>',
    );
  });

  it('keeps a written flush body bare', () => {
    const page = masonry([panelOf('Frame', '<iframe></iframe>', { inset: 'flush' })]);

    expect(page).toContain('<div class="panel-body is-flush"><iframe></iframe></div>');
  });

  it('carries the controls inside the panel tools', () => {
    const page = masonry([panelOf('Tools', '<p>x</p>', { controls: '<button>b</button>' })]);

    expect(page).toContain('<span class="panel-tools"><button>b</button></span>');
  });
});

describe('the rows the bricks flow into', () => {
  it('lays two halves side by side and wraps the third below', () => {
    const page = masonry([
      panelOf('One', '<p>1</p>'),
      panelOf('Two', '<p>2</p>'),
      panelOf('Three', '<p>3</p>'),
    ]);

    expect(page).toContain('gs-id="one" gs-x="0" gs-y="0" gs-w="6" gs-h="24"');
    expect(page).toContain('gs-id="two" gs-x="6" gs-y="0" gs-w="6" gs-h="24"');
    expect(page).toContain('gs-id="three" gs-x="0" gs-y="24" gs-w="6" gs-h="24"');
  });

  it('drops the next row below the tallest brick of the last', () => {
    const page = masonry([
      panelOf('Short', '<p>1</p>'),
      panelOf('Tall', '<p>2</p>', { height: 'viewport' }),
      panelOf('After', '<p>3</p>', { width: 'full' }),
    ]);

    expect(page).toContain('gs-id="tall" gs-x="6" gs-y="0" gs-w="6" gs-h="76"');
    expect(page).toContain('gs-id="after" gs-x="0" gs-y="76" gs-w="12" gs-h="24"');
  });

  it('joins the bricks seamlessly', () => {
    const page = masonry([panelOf('One', '<p>1</p>'), panelOf('Two', '<p>2</p>')]);

    expect(page).toContain('</div></div><div class="grid-stack-item" gs-id="two"');
  });
});
