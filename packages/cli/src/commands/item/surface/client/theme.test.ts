import { beforeEach, describe, expect, it } from 'vitest';

import { wireTheme } from './theme.ts';

let chosen = 'system';

function themeDom(): void {
  document.body.innerHTML = `<div class="theme-switch">
    <button type="button" class="theme-option" data-theme="system">System</button>
    <button type="button" class="theme-option" data-theme="dark">Dark</button>
    <button type="button" class="theme-option" data-theme="light">Light</button>
  </div>`;
}

function optionFor(theme: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.theme-option[data-theme="${theme}"]`);

  if (node === null) {
    throw new Error(`no option for ${theme}`);
  }

  return node;
}

beforeEach(() => {
  chosen = 'system';
  Reflect.set(globalThis, 'ketSurfaceTheme', {
    chosen: () => chosen,
    choose: (wanted: string) => {
      chosen = wanted;
      document.dispatchEvent(new CustomEvent('ket-surface-scheme'));
    },
  });
  themeDom();
});

describe('the theme switch the header offers', () => {
  it('marks the carried choice as selected on wiring', () => {
    chosen = 'dark';
    wireTheme();

    expect(optionFor('dark').classList.contains('is-selected')).toBe(true);
    expect(optionFor('system').classList.contains('is-selected')).toBe(false);
    expect(optionFor('light').classList.contains('is-selected')).toBe(false);
  });

  it('hands a clicked option to the theme carrier and repaints', () => {
    wireTheme();
    optionFor('light').click();

    expect(chosen).toBe('light');
    expect(optionFor('light').classList.contains('is-selected')).toBe(true);
    expect(optionFor('system').classList.contains('is-selected')).toBe(false);
  });

  it('repaints when the scheme changes elsewhere', () => {
    wireTheme();
    chosen = 'dark';
    document.dispatchEvent(new CustomEvent('ket-surface-scheme'));

    expect(optionFor('dark').classList.contains('is-selected')).toBe(true);
  });

  it('stays silent on a page without the switch', () => {
    document.body.innerHTML = '';

    expect(() => {
      wireTheme();
    }).not.toThrow();
  });

  it('treats an unlabeled option as the system choice', () => {
    const bare = document.createElement('button');

    bare.className = 'theme-option';
    document.querySelector('.theme-switch')?.append(bare);
    chosen = 'dark';
    wireTheme();
    bare.click();

    expect(chosen).toBe('system');
  });
});
