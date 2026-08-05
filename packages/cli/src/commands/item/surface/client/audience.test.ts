import { beforeEach, describe, expect, it } from 'vitest';

import { wireAudience } from './audience.ts';

function audienceDom(): void {
  document.body.innerHTML = `<div>
    <div class="audience-switch" data-audience-group="design">
      <button type="button" class="audience-option is-selected" data-audience="technical">Technical</button>
      <button type="button" class="audience-option" data-audience="plain">Plain</button>
    </div>
    <div class="audience-variants" data-audience-group="design">
      <div class="audience-variant is-active" data-audience="technical">tech</div>
      <div class="audience-variant" data-audience="plain">plain</div>
    </div>
  </div>`;
}

function variant(audience: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `.audience-variant[data-audience="${audience}"]`,
  );

  if (node === null) {
    throw new Error(`no variant for ${audience}`);
  }

  return node;
}

function option(audience: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(
    `.audience-option[data-audience="${audience}"]`,
  );

  if (node === null) {
    throw new Error(`no option for ${audience}`);
  }

  return node;
}

beforeEach(() => {
  localStorage.clear();
  audienceDom();
});

describe('the audience the variants open for', () => {
  it('shows the technical variant when nothing is stored', () => {
    wireAudience();

    expect(variant('technical').classList.contains('is-active')).toBe(true);
    expect(variant('plain').classList.contains('is-active')).toBe(false);
  });

  it('honors a stored audience the group offers', () => {
    localStorage.setItem('ket-surface-audience', 'plain');
    wireAudience();

    expect(variant('plain').classList.contains('is-active')).toBe(true);
    expect(option('plain').classList.contains('is-selected')).toBe(true);
    expect(option('technical').classList.contains('is-selected')).toBe(false);
  });

  it('falls back to technical when the stored audience is not offered', () => {
    localStorage.setItem('ket-surface-audience', 'plain');
    option('plain').disabled = true;
    wireAudience();

    expect(variant('technical').classList.contains('is-active')).toBe(true);
    expect(variant('plain').classList.contains('is-active')).toBe(false);
  });
});

describe('the audience a reader picks', () => {
  it('paints and stores the clicked audience', () => {
    wireAudience();
    option('plain').click();

    expect(variant('plain').classList.contains('is-active')).toBe(true);
    expect(variant('technical').classList.contains('is-active')).toBe(false);
    expect(localStorage.getItem('ket-surface-audience')).toBe('plain');
  });

  it('ignores a click that reaches a disabled option', () => {
    const numb = document.createElement('a');

    numb.className = 'audience-option';
    numb.dataset['audience'] = 'plain';
    Reflect.set(numb, 'disabled', true);
    document.querySelector('.audience-switch')?.append(numb);
    wireAudience();
    numb.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(variant('technical').classList.contains('is-active')).toBe(true);
    expect(localStorage.getItem('ket-surface-audience')).toBeNull();
  });

  it('stores the technical default for an unlabeled option', () => {
    const bare = document.createElement('button');

    bare.className = 'audience-option';
    document.querySelector('.audience-switch')?.append(bare);
    wireAudience();
    bare.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(localStorage.getItem('ket-surface-audience')).toBe('technical');
  });

  it('falls back to technical when the group has no switch at all', () => {
    localStorage.setItem('ket-surface-audience', 'plain');
    document.querySelector('.audience-switch')?.remove();
    wireAudience();

    expect(variant('technical').classList.contains('is-active')).toBe(true);
    expect(variant('plain').classList.contains('is-active')).toBe(false);
  });
});
