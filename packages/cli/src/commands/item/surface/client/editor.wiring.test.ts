import { beforeEach, describe, expect, it, vi } from 'vitest';

const seen = vi.hoisted((): { measured: number; effects: unknown[] } => ({
  measured: 0,
  effects: [],
}));

vi.mock('codemirror', () => ({
  basicSetup: [],
  EditorView: class {
    state = { doc: { toString: (): string => 'held' } };

    constructor(_options: object) {
      seen.measured += 0;
    }

    requestMeasure(): void {
      seen.measured += 1;
    }

    dispatch(spec: { effects: unknown }): void {
      seen.effects.push(spec.effects);
    }
  },
}));
vi.mock('@codemirror/language', () => ({ StreamLanguage: { define: (): unknown[] => [] } }));
vi.mock('@codemirror/legacy-modes/mode/gherkin', () => ({ gherkin: {} }));
vi.mock('@codemirror/state', () => ({
  Compartment: class {
    of(extension: unknown): unknown {
      return extension;
    }

    reconfigure(extension: unknown): unknown {
      return { theme: extension };
    }
  },
}));
vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: 'the-dark-theme' }));

const { wireEditors } = await import('./editor.ts');

function cardsDom(): void {
  document.body.innerHTML = `<article class="feature-card" data-feature="a.feature">
    <button type="button" class="feature-save"></button>
    <div class="feature-editor"></div>
    <script type="application/json" class="feature-source">"Feature: A\\n"</script>
  </article>
  <article class="feature-card" data-feature="b.feature">
    <button type="button" class="feature-save"></button>
    <div class="feature-editor"></div>
    <script type="application/json" class="feature-source">"Feature: B\\n"</script>
  </article>`;
}

beforeEach(() => {
  seen.measured = 0;
  seen.effects.length = 0;
  document.documentElement.dataset['scheme'] = 'dark';
  cardsDom();
});

describe('the measures and dress changes the editors follow', () => {
  it('measures every mounted editor when a section is shown', () => {
    wireEditors();
    document.dispatchEvent(new CustomEvent('ket-surface-shown'));

    expect(seen.measured).toBe(2);
  });

  it('undresses to plain when the scheme turns light', () => {
    wireEditors();
    document.documentElement.dataset['scheme'] = 'light';
    document.dispatchEvent(new CustomEvent('ket-surface-scheme'));

    expect(seen.effects.slice(-2)).toEqual([{ theme: [] }, { theme: [] }]);
  });

  it('dresses dark again when the scheme leaves light', () => {
    document.documentElement.dataset['scheme'] = 'light';
    wireEditors();
    document.documentElement.dataset['scheme'] = 'dark';
    document.dispatchEvent(new CustomEvent('ket-surface-scheme'));

    expect(seen.effects.slice(-2)).toEqual([
      { theme: 'the-dark-theme' },
      { theme: 'the-dark-theme' },
    ]);
  });
});
