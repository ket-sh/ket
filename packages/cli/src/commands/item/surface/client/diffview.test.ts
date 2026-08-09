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

function explorerDom(): void {
  document.body.innerHTML = `<div class="diff-panel">
    <nav class="diff-tree">
      <button type="button" class="diff-tree-item is-selected" data-diff-target="file-one"></button>
      <button type="button" class="diff-tree-item" data-diff-target="file-two"></button>
    </nav>
    <div class="diff-stage">
      <article class="diff-file is-shown" id="file-one"></article>
      <article class="diff-file" id="file-two"></article>
    </div>
  </div>`;
}

function treeItem(target: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.diff-tree-item[data-diff-target="${target}"]`);

  if (node === null) {
    throw new Error(`no tree item for ${target}`);
  }

  return node;
}

function shownFiles(): string[] {
  return [...document.querySelectorAll<HTMLElement>('.diff-file')]
    .filter((node) => node.classList.contains('is-shown'))
    .map((node) => node.id);
}

function selectedRows(): string[] {
  return [...document.querySelectorAll<HTMLElement>('.diff-tree-item')]
    .filter((node) => node.classList.contains('is-selected'))
    .map((node) => node.dataset['diffTarget'] ?? '');
}

describe('the file the tree presses onto the stage', () => {
  it('shows the pressed file alone and moves the selection', () => {
    explorerDom();
    wireDiffview();
    treeItem('file-two').click();

    expect(shownFiles()).toEqual(['file-two']);
    expect(selectedRows()).toEqual(['file-two']);
  });

  it('keeps the stage still on a press of the already chosen row', () => {
    explorerDom();
    wireDiffview();
    treeItem('file-one').click();

    expect(shownFiles()).toEqual(['file-one']);
    expect(selectedRows()).toEqual(['file-one']);
  });

  it('keeps the shown file when a bare row names no target', () => {
    explorerDom();

    const bare = document.createElement('button');

    bare.className = 'diff-tree-item';
    document.querySelector('.diff-tree')?.append(bare);
    wireDiffview();
    bare.click();

    expect(shownFiles()).toEqual(['file-one']);
  });
});
