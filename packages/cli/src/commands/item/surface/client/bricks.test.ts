import { beforeEach, describe, expect, it } from 'vitest';

import type { FakeBrickEngine } from './bricklayer.fake.test.ts';

import { fakeBricks } from './bricklayer.fake.test.ts';

Reflect.set(window, 'ketSurface', {
  live: '/ws?key=k',
  itemKey: 'K-7',
  selected: 'design',
  routes: {},
  firstChild: {},
});

const { settleGrid, wireBricks } = await import('./bricks.ts');

wireBricks();

let engine: FakeBrickEngine;

function brickDom(): void {
  document.body.innerHTML = `<section class="section is-active" id="section-design" data-section="design"><div class="grid-stack">
    <div class="grid-stack-item" gs-id="prose" gs-x="0" gs-y="0" gs-w="12" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-content"><div class="panel-head"><span class="panel-label">Prose</span><span class="panel-tools"></span></div><div class="panel-body"></div></div></div></div>
    <div class="grid-stack-item" gs-id="frame" gs-x="0" gs-y="24" gs-w="6" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-viewport"><div class="panel-head"><span class="panel-label">Frame</span></div><div class="panel-body"></div></div></div></div>
  </div></section>`;
}

function brick(gsId: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.grid-stack-item[gs-id="${gsId}"]`);

  if (node === null) {
    throw new Error(`no brick ${gsId}`);
  }

  return node;
}

beforeEach(() => {
  localStorage.clear();
  engine = fakeBricks();
  Reflect.set(window, 'GridStack', engine);
  brickDom();
});

describe('the engine the bricks stand on', () => {
  it('hands the engine the brick contract once per section', () => {
    settleGrid();
    settleGrid();

    expect(engine.seen.inits).toBe(1);
    expect(engine.seen.options).toMatchObject({
      column: 12,
      cellHeight: 8,
      margin: 8,
      float: false,
      minRow: 1,
      animate: true,
      sizeToContent: false,
      handle: '.panel-head',
    });
    expect(engine.seen.options['draggable']).toEqual({ cancel: '.panel-tools' });
    expect(engine.seen.options['resizable']).toEqual({
      handles: 'n,ne,e,se,s,sw,w,nw',
      autoHide: false,
    });
  });

  it('leaves a page without an active section alone', () => {
    document.body.innerHTML = '<section class="section" data-section="design"></section>';
    settleGrid();

    expect(engine.seen.inits).toBe(0);
  });
});

describe('the shape bricks take when nothing is stored', () => {
  it('sizes content bricks to their content and viewport bricks to the frame', () => {
    settleGrid();

    expect(brick('prose').getAttribute('gs-size-to-content')).toBe('12');
    expect(brick('prose').getAttribute('gs-h')).toBe('24');
    expect(brick('frame').getAttribute('gs-h')).toBe('12');
    expect(brick('frame').getAttribute('gs-size-to-content')).toBe('false');
  });

  it('paints spans as full or column by their width', () => {
    settleGrid();

    expect(brick('prose').querySelector('.panel')?.classList.contains('is-full')).toBe(true);
    expect(brick('frame').querySelector('.panel')?.classList.contains('is-column')).toBe(true);
  });

  it('lets the frame height follow the section height', () => {
    const section = document.getElementById('section-design');

    if (section !== null) {
      Object.defineProperty(section, 'clientHeight', { value: 400 });
    }

    settleGrid();

    expect(brick('frame').getAttribute('gs-h')).toBe('50');
  });
});

describe('the layout a section remembers between visits', () => {
  it('loads the stored layout snapped to the legal slots', () => {
    localStorage.setItem(
      'ket-surface-layout:K-7:design',
      JSON.stringify([
        { id: 'prose', x: 5, w: 10 },
        { id: 'frame', x: 4, w: 3 },
      ]),
    );
    settleGrid();

    expect(brick('prose').getAttribute('gs-w')).toBe('12');
    expect(brick('prose').getAttribute('gs-x')).toBe('0');
    expect(brick('frame').getAttribute('gs-w')).toBe('6');
    expect(brick('frame').getAttribute('gs-x')).toBe('6');
  });

  it('stores the layout whenever the grid announces a change after loading', () => {
    settleGrid();

    expect(localStorage.getItem('ket-surface-layout:K-7:design')).toBeNull();

    engine.fire('change', brick('frame'));

    const stored = localStorage.getItem('ket-surface-layout:K-7:design') ?? '';

    expect(JSON.parse(stored)).toEqual([
      { id: 'prose', x: 0, y: 0, w: 12, h: 24 },
      { id: 'frame', x: 0, y: 24, w: 6, h: 12 },
    ]);
  });

  it('saves layouts without content and without meta', () => {
    settleGrid();
    engine.fire('change', brick('prose'));

    expect(engine.seen.saves).toEqual([{ content: false, full: false }]);
  });

  it('loads a stored layout without pruning strangers', () => {
    localStorage.setItem(
      'ket-surface-layout:K-7:design',
      JSON.stringify([{ id: 'prose', x: 0, w: 12 }]),
    );
    settleGrid();

    expect(engine.seen.loads).toEqual([{ count: 1, addAndRemove: false }]);
  });

  it('files a section without a name under the empty key', () => {
    document.getElementById('section-design')?.removeAttribute('data-section');
    settleGrid();
    engine.fire('change', brick('prose'));

    expect(localStorage.getItem('ket-surface-layout:K-7:')).not.toBeNull();
  });
});

describe('the wires the page-level events pull', () => {
  it('resizes the settled grid when the window changes', () => {
    settleGrid();

    const before = engine.seen.resizes;

    window.dispatchEvent(new Event('resize'));

    expect(engine.seen.resizes).toBeGreaterThan(before);
  });

  it('stays calm when the active section has no grid', () => {
    document.body.innerHTML = '<section class="section is-active" data-section="empty"></section>';

    expect(() => {
      window.dispatchEvent(new Event('resize'));
    }).not.toThrow();
    expect(engine.seen.inits).toBe(0);
  });

  it('builds a grid the moment a fresh section is shown', () => {
    settleGrid();

    expect(engine.seen.inits).toBe(1);

    brickDom();
    document.dispatchEvent(new CustomEvent('ket-surface-shown'));

    expect(engine.seen.inits).toBe(2);
  });
});
