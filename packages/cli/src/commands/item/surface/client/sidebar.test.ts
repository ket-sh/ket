import { beforeEach, describe, expect, it } from 'vitest';

import { fakeBricks } from './bricklayer.fake.test.ts';

Reflect.set(window, 'ketSurface', {
  live: '/ws?key=k',
  itemKey: 'K-7',
  selected: 'design',
  routes: {},
  firstChild: {},
});

const { wireSidebar } = await import('./sidebar.ts');

function sidebarDom(): void {
  document.body.className = '';
  document.body.innerHTML = `<button type="button" class="nav-toggle" aria-expanded="true"></button>`;
}

function toggle(): HTMLElement {
  const node = document.querySelector<HTMLElement>('.nav-toggle');

  if (node === null) {
    throw new Error('no nav toggle');
  }

  return node;
}

beforeEach(() => {
  localStorage.clear();
  sidebarDom();
});

describe('the sidebar the toggle folds', () => {
  it('opens wide when nothing is stored', () => {
    wireSidebar();

    expect(document.body.classList.contains('is-nav-collapsed')).toBe(false);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('honors a stored collapse', () => {
    localStorage.setItem('ket-surface-nav', 'collapsed');
    wireSidebar();

    expect(document.body.classList.contains('is-nav-collapsed')).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('folds, stores, and unfolds on clicks', () => {
    wireSidebar();
    toggle().click();

    expect(document.body.classList.contains('is-nav-collapsed')).toBe(true);
    expect(localStorage.getItem('ket-surface-nav')).toBe('collapsed');

    toggle().click();

    expect(document.body.classList.contains('is-nav-collapsed')).toBe(false);
    expect(localStorage.getItem('ket-surface-nav')).toBe('expanded');
  });

  it('stays silent on a page without the toggle', () => {
    document.body.innerHTML = '';

    expect(() => {
      wireSidebar();
    }).not.toThrow();
  });
});

function slid(propertyName: string): Event {
  const event = new Event('transitionend', { bubbles: true });

  Reflect.set(event, 'propertyName', propertyName);

  return event;
}

async function flushedFrame(): Promise<void> {
  await new Promise((frame) => {
    requestAnimationFrame(() => {
      frame(undefined);
    });
  });
}

describe('the settle the finished slide triggers', () => {
  it('rebuilds the grid when the columns finish sliding', async () => {
    const engine = fakeBricks();

    Reflect.set(window, 'GridStack', engine);
    document.body.innerHTML = `<button type="button" class="nav-toggle"></button>
      <section class="section is-active" data-section="design"><div class="grid-stack"></div></section>`;
    wireSidebar();
    document.body.dispatchEvent(slid('grid-template-columns'));

    expect(engine.seen.inits).toBe(1);

    await flushedFrame();
  });

  it('ignores other transitions and other targets', async () => {
    const engine = fakeBricks();

    Reflect.set(window, 'GridStack', engine);
    document.body.innerHTML = `<button type="button" class="nav-toggle"></button>
      <section class="section is-active" data-section="design"><div class="grid-stack"></div></section>`;
    wireSidebar();
    document.body.dispatchEvent(slid('opacity'));
    toggle().dispatchEvent(slid('grid-template-columns'));

    expect(engine.seen.inits).toBe(0);

    await flushedFrame();
  });
});
