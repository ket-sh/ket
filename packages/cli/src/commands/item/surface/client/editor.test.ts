import { beforeEach, describe, expect, it, vi } from 'vitest';

import { wireEditors } from './editor.ts';

interface SentPost {
  address: string;
  body: string;
  method: string;
}

const sent: SentPost[] = [];
let answer: { ok: boolean; status: number } = { ok: true, status: 204 };
let refuse = false;
let gate: Promise<void> | undefined;
let openGate: (() => void) | undefined;

function holdSaves(): void {
  gate = new Promise<void>((opened) => {
    openGate = opened;
  });
}

async function fetchStub(
  address: string,
  options: { body: string; method: string },
): Promise<object> {
  sent.push({ address, body: options.body, method: options.method });

  if (gate !== undefined) {
    await gate;
  }

  await Promise.resolve();

  if (refuse) {
    throw new Error('the network refused');
  }

  return answer;
}

function cardDom(): void {
  document.body.innerHTML = `<article class="feature-card" data-feature="a.feature">
    <header class="feature-card-head"><span class="feature-name">a.feature</span><button type="button" class="feature-save" data-feature="a.feature">Save</button></header>
    <div class="feature-editor"></div>
    <script type="application/json" class="feature-source">"Feature: One\\n"</script>
  </article>`;
}

function saveButton(): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>('.feature-save');

  if (node === null) {
    throw new Error('no save button');
  }

  return node;
}

beforeEach(() => {
  sent.length = 0;
  answer = { ok: true, status: 204 };
  refuse = false;
  gate = undefined;
  openGate = undefined;
  Reflect.set(globalThis, 'fetch', fetchStub);
  history.replaceState(null, '', '/?key=the-test-key');
  cardDom();
});

describe('the editor every feature card mounts', () => {
  it('opens a code editor carrying the embedded source', () => {
    wireEditors();

    expect(document.querySelectorAll('.feature-card .cm-editor')).toHaveLength(1);
    expect(document.querySelector('.cm-content')?.textContent).toContain('Feature: One');
  });

  it('saves the document through the keyed artifact route', async () => {
    wireEditors();
    saveButton().click();

    await vi.waitFor(() => {
      expect(saveButton().textContent).toBe('Saved');
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.address).toBe('/artifact?key=the-test-key&name=features/a.feature');
    expect(sent[0]?.body).toContain('Feature: One');
    expect(saveButton().disabled).toBe(false);
  });

  it('tells the reader when the route refuses the save', async () => {
    answer = { ok: false, status: 400 };
    wireEditors();
    saveButton().click();

    await vi.waitFor(() => {
      expect(saveButton().textContent).toBe('Refused 400');
    });
  });

  it('tells the reader when the network fails the save', async () => {
    refuse = true;
    wireEditors();
    saveButton().click();

    await vi.waitFor(() => {
      expect(saveButton().textContent).toBe('Save failed');
    });
  });
});

describe('the saves the editor sends', () => {
  it('posts the save, and with an empty key when the page carries none', async () => {
    history.replaceState(null, '', '/');
    wireEditors();
    saveButton().click();

    await vi.waitFor(() => {
      expect(saveButton().textContent).toBe('Saved');
    });
    expect(sent[0]?.method).toBe('POST');
    expect(sent[0]?.address).toBe('/artifact?key=&name=features/a.feature');
  });

  it('holds the button while the save is in flight', async () => {
    holdSaves();
    wireEditors();
    saveButton().click();

    expect(saveButton().disabled).toBe(true);
    expect(saveButton().textContent).toBe('Saving');

    openGate?.();
    await vi.waitFor(() => {
      expect(saveButton().textContent).toBe('Saved');
    });
    expect(saveButton().disabled).toBe(false);
  });
});

describe('the sources a card can carry', () => {
  it('opens empty when the card carries no source', () => {
    document.querySelector('.feature-source')?.remove();

    expect(() => {
      wireEditors();
    }).not.toThrow();
    expect(document.querySelectorAll('.cm-editor')).toHaveLength(1);
    expect(document.querySelector('.cm-content')?.textContent).not.toContain('Feature');
  });

  it('opens empty when the source is not text', () => {
    const holder = document.querySelector('.feature-source');

    if (holder !== null) {
      holder.textContent = '42';
    }

    wireEditors();

    expect(document.querySelector('.cm-content')?.textContent).toBe('');
  });

  it('redresses every editor when the scheme changes', () => {
    wireEditors();

    const editor = document.querySelector('.cm-editor');
    const dark = editor?.className ?? '';

    document.documentElement.dataset['scheme'] = 'light';
    document.dispatchEvent(new CustomEvent('ket-surface-scheme'));

    expect(editor?.className).not.toBe(dark);
  });
});
