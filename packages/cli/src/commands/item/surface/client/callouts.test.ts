import { beforeEach, describe, expect, it } from 'vitest';

import { wireCallouts } from './callouts.ts';

function calloutDom(): void {
  document.body.innerHTML = `<section id="section-design">
    <button type="button" class="callout-switch"></button>
    <span data-callout-shape="gate">one</span>
    <span data-callout-shape="gate">two</span>
    <span data-callout-shape="ring">other</span>
  </section>`;
}

function home(): HTMLElement {
  const node = document.getElementById('section-design');

  if (node === null) {
    throw new Error('no design section');
  }

  return node;
}

function switchNode(): HTMLElement {
  const node = document.querySelector<HTMLElement>('.callout-switch');

  if (node === null) {
    throw new Error('no callout switch');
  }

  return node;
}

beforeEach(() => {
  localStorage.clear();
  calloutDom();
});

describe('the callout switch the design section keeps', () => {
  it('starts with callouts on when nothing is stored', () => {
    wireCallouts();

    expect(home().classList.contains('callouts-off')).toBe(false);
    expect(switchNode().getAttribute('aria-pressed')).toBe('true');
    expect(switchNode().textContent).toBe('Callouts on');
  });

  it('honors a stored off state', () => {
    localStorage.setItem('ket-surface-callouts', 'off');
    wireCallouts();

    expect(home().classList.contains('callouts-off')).toBe(true);
    expect(switchNode().textContent).toBe('Callouts off');
  });

  it('flips and stores the state on click', () => {
    wireCallouts();
    switchNode().click();

    expect(home().classList.contains('callouts-off')).toBe(true);
    expect(switchNode().getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem('ket-surface-callouts')).toBe('off');

    switchNode().click();

    expect(home().classList.contains('callouts-off')).toBe(false);
    expect(localStorage.getItem('ket-surface-callouts')).toBe('on');
  });

  it('stays silent on a page without the design section', () => {
    document.body.innerHTML = '';

    expect(() => {
      wireCallouts();
    }).not.toThrow();
  });
});

describe('the lighting a hovered callout shape spreads', () => {
  function shapes(shape: string): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(`[data-callout-shape="${shape}"]`)];
  }

  function poke(shape: string, type: string): void {
    for (const node of shapes(shape).slice(0, 1)) {
      node.dispatchEvent(new Event(type));
    }
  }

  it('lights every node of the entered shape and no other', () => {
    wireCallouts();
    poke('gate', 'mouseenter');

    expect(shapes('gate').every((node) => node.classList.contains('is-lit'))).toBe(true);
    expect(shapes('ring').some((node) => node.classList.contains('is-lit'))).toBe(false);
  });

  it('dims the shape again on leave', () => {
    wireCallouts();
    poke('gate', 'mouseenter');
    poke('gate', 'mouseleave');

    expect(shapes('gate').some((node) => node.classList.contains('is-lit'))).toBe(false);
  });

  it('lights on focus and dims on blur for keyboard travel', () => {
    wireCallouts();
    poke('gate', 'focus');

    expect(shapes('gate').every((node) => node.classList.contains('is-lit'))).toBe(true);

    poke('gate', 'blur');

    expect(shapes('gate').some((node) => node.classList.contains('is-lit'))).toBe(false);
  });
});
