import { beforeEach, describe, expect, it } from 'vitest';

Reflect.set(window, 'ketSurface', {
  live: '/ws?key=k',
  itemKey: 'K-7',
  selected: 'design',
  routes: {
    'criteria/a.feature': { section: 'criteria', feature: 'a.feature' },
    'criteria/b.feature': { section: 'criteria', feature: 'b.feature' },
  },
  firstChild: { criteria: 'criteria/a.feature' },
});

const { wireNav } = await import('./nav.ts');

function navDom(): void {
  document.body.innerHTML = `<nav>
    <p class="nav-item" data-section="design"></p>
    <p class="nav-item" data-section="criteria"></p>
    <a class="nav-child" data-route="criteria/a.feature"></a>
    <a class="nav-child" data-route="criteria/b.feature"></a>
  </nav>
  <main>
    <section class="section" id="section-design" data-section="design"></section>
    <section class="section" id="section-criteria" data-section="criteria">
      <article class="feature-card" data-feature="a.feature"></article>
      <article class="feature-card" data-feature="b.feature"></article>
    </section>
  </main>`;
}

function marked(selector: string, marker: string): string[] {
  return [...document.querySelectorAll<HTMLElement>(selector)]
    .filter((node) => node.classList.contains(marker))
    .map(
      (node) => node.dataset['section'] ?? node.dataset['route'] ?? node.dataset['feature'] ?? '',
    );
}

beforeEach(() => {
  navDom();
  location.hash = '';
});

describe('the section the hash steers to', () => {
  it('opens the carried selection when the hash names nothing', () => {
    wireNav();

    expect(marked('.section', 'is-active')).toEqual(['design']);
    expect(marked('.nav-item', 'is-selected')).toEqual(['design']);
    expect(marked('.feature-card', 'is-active')).toEqual([]);
  });

  it('opens a section by name and selects its first child', () => {
    location.hash = 'criteria';
    wireNav();

    expect(marked('.section', 'is-active')).toEqual(['criteria']);
    expect(marked('.nav-child', 'is-selected')).toEqual(['criteria/a.feature']);
    expect(marked('.feature-card', 'is-active')).toEqual(['a.feature']);
  });

  it('opens a child route and lights its feature card', () => {
    location.hash = 'criteria/b.feature';
    wireNav();

    expect(marked('.section', 'is-active')).toEqual(['criteria']);
    expect(marked('.nav-child', 'is-selected')).toEqual(['criteria/b.feature']);
    expect(marked('.feature-card', 'is-active')).toEqual(['b.feature']);
  });

  it('falls back to the carried selection for an unknown hash', () => {
    location.hash = 'nowhere';
    wireNav();

    expect(marked('.section', 'is-active')).toEqual(['design']);
  });

  it('follows a later hash change', () => {
    wireNav();
    location.hash = 'criteria';
    window.dispatchEvent(new Event('hashchange'));

    expect(marked('.section', 'is-active')).toEqual(['criteria']);
  });

  it('announces every shown section to the page', () => {
    let announced = 0;
    const witness = (): void => {
      announced += 1;
    };

    document.addEventListener('ket-surface-shown', witness);
    wireNav();
    document.removeEventListener('ket-surface-shown', witness);

    expect(announced).toBe(1);
  });
});

describe('the marks unlabeled nodes never get', () => {
  it('leaves unlabeled cards and children alone when nothing is selected', () => {
    document
      .getElementById('section-criteria')
      ?.insertAdjacentHTML('beforeend', '<article class="feature-card">bare</article>');
    document.querySelector('nav')?.insertAdjacentHTML('beforeend', '<a class="nav-child">bare</a>');
    wireNav();

    expect(marked('.feature-card', 'is-active')).toEqual([]);
    expect(marked('.nav-child', 'is-selected')).toEqual([]);
  });
});

function diffDom(): void {
  document.body.innerHTML = `<div class="panel-body">
    <ul class="diff-index"><li class="diff-index-item" data-diff-target="file-one"></li></ul>
    <details class="diff-file" id="file-one"><summary>one</summary></details>
    <details class="diff-file is-jumped" id="file-two" open><summary>two</summary></details>
  </div>`;
}

function rectStub(target: Element | null, top: number, height: number): void {
  if (target !== null) {
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: () => ({
        top,
        height,
        bottom: top + height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
      }),
    });
  }
}

async function settled(): Promise<void> {
  await new Promise((frame) => {
    requestAnimationFrame(() => {
      frame(undefined);
    });
  });
}

function detailsAt(id: string): HTMLDetailsElement {
  const node = document.getElementById(id);

  if (!(node instanceof HTMLDetailsElement)) {
    throw new Error(`no details ${id}`);
  }

  return node;
}

describe('the jump the diff index offers', () => {
  it('opens and marks the target file and clears the last one', async () => {
    diffDom();
    wireNav();

    document.querySelector<HTMLElement>('.diff-index-item')?.click();
    await settled();

    expect(detailsAt('file-one').open).toBe(true);
    expect(detailsAt('file-one').classList.contains('is-jumped')).toBe(true);
    expect(detailsAt('file-two').classList.contains('is-jumped')).toBe(false);
  });

  it('scrolls the surface under the pinned index', async () => {
    diffDom();
    wireNav();

    const surface = document.querySelector<HTMLElement>('.panel-body');

    rectStub(surface, 100, 800);
    rectStub(document.querySelector('.diff-index'), 100, 40);
    rectStub(document.getElementById('file-one'), 300, 60);
    document.querySelector<HTMLElement>('.diff-index-item')?.click();
    await settled();

    expect(surface?.scrollTop).toBe(160);
  });
});
