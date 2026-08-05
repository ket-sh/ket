import { beforeEach, describe, expect, it } from 'vitest';

import { wireDiffview } from './diffview.ts';

function diffDom(): void {
  document.body.innerHTML = `<div class="diff-panel">
    <button type="button" class="diff-format-option" data-diff-format="unified">Unified</button>
    <button type="button" class="diff-format-option" data-diff-format="side">Side</button>
  </div>`;
}

function panel(): HTMLElement {
  const node = document.querySelector<HTMLElement>('.diff-panel');

  if (node === null) {
    throw new Error('no diff panel');
  }

  return node;
}

function option(format: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `.diff-format-option[data-diff-format="${format}"]`,
  );

  if (node === null) {
    throw new Error(`no option for ${format}`);
  }

  return node;
}

beforeEach(() => {
  localStorage.clear();
  diffDom();
});

describe('the format the diff panel opens with', () => {
  it('opens unified when nothing is stored', () => {
    wireDiffview();

    expect(panel().classList.contains('is-side')).toBe(false);
    expect(option('unified').classList.contains('is-selected')).toBe(true);
    expect(option('side').classList.contains('is-selected')).toBe(false);
  });

  it('honors a stored side-by-side choice', () => {
    localStorage.setItem('ket-surface-diff-format', 'side');
    wireDiffview();

    expect(panel().classList.contains('is-side')).toBe(true);
    expect(option('side').classList.contains('is-selected')).toBe(true);
  });

  it('stays silent on a page without a diff panel', () => {
    document.body.innerHTML = '';

    expect(() => {
      wireDiffview();
    }).not.toThrow();
  });
});

describe('the format a reader flips to', () => {
  it('paints and stores the clicked format', () => {
    wireDiffview();
    option('side').click();

    expect(panel().classList.contains('is-side')).toBe(true);
    expect(localStorage.getItem('ket-surface-diff-format')).toBe('side');

    option('unified').click();

    expect(panel().classList.contains('is-side')).toBe(false);
    expect(localStorage.getItem('ket-surface-diff-format')).toBe('unified');
  });

  it('stores the unified default for an unlabeled option', () => {
    const bare = document.createElement('button');

    bare.className = 'diff-format-option';
    document.querySelector('.diff-panel')?.append(bare);
    wireDiffview();
    bare.click();

    expect(localStorage.getItem('ket-surface-diff-format')).toBe('unified');
  });

  it('keeps the click to itself so the panel head cannot fold', () => {
    wireDiffview();

    let escaped = false;
    const witness = (): void => {
      escaped = true;
    };

    document.body.addEventListener('click', witness);
    option('side').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    document.body.removeEventListener('click', witness);

    expect(escaped).toBe(false);
  });
});
