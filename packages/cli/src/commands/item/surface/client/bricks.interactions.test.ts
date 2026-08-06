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

const bricks = await import('./bricks.ts');

bricks.wireBricks();

let engine: FakeBrickEngine;

function pairDom(): void {
  document.body.innerHTML = `<section class="section is-active" id="section-design" data-section="design"><div class="grid-stack">
    <div class="grid-stack-item" gs-id="left" gs-x="0" gs-y="0" gs-w="6" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-content"><div class="panel-head"><span class="panel-label">Left</span><span class="panel-tools"><button type="button" class="callout-switch"></button></span></div><div class="panel-body"></div></div></div></div>
    <div class="grid-stack-item" gs-id="right" gs-x="6" gs-y="0" gs-w="6" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-content"><div class="panel-head"><span class="panel-label">Right</span></div><div class="panel-body"></div></div></div></div>
  </div></section>`;
}

function brick(gsId: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.grid-stack-item[gs-id="${gsId}"]`);

  if (node === null) {
    throw new Error(`no brick ${gsId}`);
  }

  return node;
}

function headOf(gsId: string): HTMLElement {
  const node = brick(gsId).querySelector<HTMLElement>('.panel-head');

  if (node === null) {
    throw new Error(`no head on ${gsId}`);
  }

  return node;
}

function pressDblclick(target: HTMLElement): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
  );
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 10, clientY: 10 }));
}

beforeEach(() => {
  localStorage.clear();
  engine = fakeBricks();
  Reflect.set(window, 'GridStack', engine);
  pairDom();
  bricks.settleGrid();
});

describe('the span a double click on the head toggles', () => {
  it('widens a half to full and remembers the narrow spot', () => {
    pressDblclick(headOf('left'));

    expect(brick('left').getAttribute('gs-w')).toBe('12');
    expect(brick('left').getAttribute('gs-x')).toBe('0');
    expect(localStorage.getItem('ket-surface-narrow:K-7:design')).toBe(
      JSON.stringify({ left: { w: 6, x: 0 } }),
    );
  });

  it('shrinks back to the remembered narrow spot', () => {
    pressDblclick(headOf('right'));
    pressDblclick(headOf('right'));

    expect(brick('right').getAttribute('gs-w')).toBe('6');
    expect(brick('right').getAttribute('gs-x')).toBe('6');
    expect(localStorage.getItem('ket-surface-narrow:K-7:design')).toBe(JSON.stringify({}));
  });

  it('ignores a double click that drifted from its press', () => {
    headOf('left').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }),
    );
    headOf('left').dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(brick('left').getAttribute('gs-w')).toBe('6');
  });

  it('ignores a double click on the panel tools', () => {
    const tools = brick('left').querySelector<HTMLElement>('.callout-switch');

    if (tools === null) {
      throw new Error('no tools');
    }

    pressDblclick(tools);

    expect(brick('left').getAttribute('gs-w')).toBe('6');
  });
});

describe('the slots a resize settles into', () => {
  it('snaps a slight east grow back to the half slot', () => {
    brick('left').setAttribute('gs-w', '8');
    engine.fire('resizestop', brick('left'));

    expect(brick('left').getAttribute('gs-w')).toBe('6');
    expect(brick('left').getAttribute('gs-x')).toBe('0');
  });

  it('lets a big grow take the full row', () => {
    brick('left').setAttribute('gs-w', '10');
    engine.fire('resizestop', brick('left'));

    expect(brick('left').getAttribute('gs-w')).toBe('12');
    expect(brick('left').getAttribute('gs-x')).toBe('0');
  });

  it('anchors a west-handle grow by its right edge', () => {
    brick('right').setAttribute('gs-x', '4');
    brick('right').setAttribute('gs-w', '8');
    engine.fire('resizestop', brick('right'));

    expect(brick('right').getAttribute('gs-w')).toBe('6');
    expect(brick('right').getAttribute('gs-x')).toBe('6');
  });
});

function foldDom(): void {
  document.body.innerHTML = `<section class="section is-active" id="section-design" data-section="design"><div class="grid-stack">
    <div class="grid-stack-item" gs-id="fold" gs-x="0" gs-y="0" gs-w="6" gs-h="24"><div class="grid-stack-item-content"><details open class="panel is-content panel-collapsible"><summary class="panel-head"><span class="panel-label">Fold</span></summary><div class="panel-body"></div></details></div></div>
  </div></section>`;
}

function folder(): HTMLDetailsElement {
  const node = document.querySelector('details.panel');

  if (!(node instanceof HTMLDetailsElement)) {
    throw new Error('no folding panel');
  }

  return node;
}

async function rested(ms: number): Promise<void> {
  await new Promise((woke) => {
    setTimeout(woke, ms);
  });
}

function pressClick(target: HTMLElement): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
  );
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
  );
}

describe('the fold a click on a summary head starts', () => {
  it('settles the fold only after the double-click window passes', async () => {
    foldDom();
    bricks.settleGrid();
    pressClick(headOf('fold'));

    const rightAfterClick = folder().open;

    await rested(300);

    expect(folder().open).toBe(!rightAfterClick);
  });

  it('yields to a double click and toggles the span instead', async () => {
    foldDom();
    bricks.settleGrid();
    pressClick(headOf('fold'));
    pressDblclick(headOf('fold'));

    const rightAfterToggle = folder().open;

    await rested(300);

    expect(folder().open).toBe(rightAfterToggle);
    expect(brick('fold').getAttribute('gs-w')).toBe('12');
  });
});

describe('the trade a finished drag makes', () => {
  it('swaps two halves when the drag lands on the neighbor slot', () => {
    engine.fire('dragstart', brick('right'));
    brick('right').setAttribute('gs-x', '1');
    engine.fire('dragstop', brick('right'));

    expect(brick('right').getAttribute('gs-x')).toBe('0');
    expect(brick('left').getAttribute('gs-x')).toBe('6');
    expect(brick('left').getAttribute('gs-y')).toBe('0');
  });

  it('only snaps when the drag stays on its own slot', () => {
    engine.fire('dragstart', brick('right'));
    brick('right').setAttribute('gs-x', '5');
    engine.fire('dragstop', brick('right'));

    expect(brick('right').getAttribute('gs-x')).toBe('6');
    expect(brick('left').getAttribute('gs-x')).toBe('0');
  });

  it('brings the partner to the vacated row, not to the top', () => {
    for (const gsId of ['left', 'right']) {
      brick(gsId).setAttribute('gs-y', '24');
    }

    engine.fire('dragstart', brick('right'));
    brick('right').setAttribute('gs-x', '1');
    engine.fire('dragstop', brick('right'));

    expect(brick('left').getAttribute('gs-x')).toBe('6');
    expect(brick('left').getAttribute('gs-y')).toBe('24');
  });
});

describe('the spans a brick without a memory takes', () => {
  it('shrinks a full brick to the left half when nothing is remembered', () => {
    document.body.innerHTML = `<section class="section is-active" id="section-design" data-section="design"><div class="grid-stack">
      <div class="grid-stack-item" gs-id="solo" gs-x="0" gs-y="0" gs-w="12" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-content"><div class="panel-head"><span class="panel-label">Solo</span></div><div class="panel-body"></div></div></div></div>
    </div></section>`;
    bricks.settleGrid();
    pressDblclick(headOf('solo'));

    expect(brick('solo').getAttribute('gs-w')).toBe('6');
    expect(brick('solo').getAttribute('gs-x')).toBe('0');
  });

  it('files a nameless brick under the empty name', () => {
    document.body.innerHTML = `<section class="section is-active" id="section-design" data-section="design"><div class="grid-stack">
      <div class="grid-stack-item" gs-x="0" gs-y="0" gs-w="6" gs-h="24"><div class="grid-stack-item-content"><div class="panel is-content"><div class="panel-head"><span class="panel-label">Nameless</span></div><div class="panel-body"></div></div></div></div>
    </div></section>`;
    bricks.settleGrid();

    const head = document.querySelector<HTMLElement>('.panel-head');

    if (head === null) {
      throw new Error('no head');
    }

    pressDblclick(head);

    expect(localStorage.getItem('ket-surface-narrow:K-7:design')).toBe(
      JSON.stringify({ '': { w: 6, x: 0 } }),
    );
  });
});
