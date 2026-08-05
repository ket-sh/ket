import type { Extension } from '@codemirror/state';

import { StreamLanguage } from '@codemirror/language';
import { gherkin } from '@codemirror/legacy-modes/mode/gherkin';
import { Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup, EditorView } from 'codemirror';

const gherkinLanguage = StreamLanguage.define(gherkin);
const themeSlot = new Compartment();

function sessionKey(): string {
  return new URLSearchParams(location.search).get('key') ?? '';
}

function schemeTheme(): Extension {
  return document.documentElement.dataset['scheme'] === 'light' ? [] : oneDark;
}

function sourceOf(card: HTMLElement): string {
  const holder = card.querySelector('.feature-source');
  const raw: unknown = JSON.parse(holder?.textContent ?? '""');

  return typeof raw === 'string' ? raw : '';
}

async function save(name: string, content: string, button: HTMLButtonElement): Promise<void> {
  const address = `/artifact?key=${encodeURIComponent(sessionKey())}&name=features/${encodeURIComponent(name)}`;

  button.disabled = true;
  button.textContent = 'Saving';

  try {
    const answer = await fetch(address, { method: 'POST', body: content });

    button.textContent = answer.ok ? 'Saved' : `Refused ${String(answer.status)}`;
  } catch {
    button.textContent = 'Save failed';
  }

  button.disabled = false;
}

function mountEditor(card: HTMLElement, mounted: EditorView[]): void {
  const name = card.dataset['feature'];
  const host = card.querySelector<HTMLElement>('.feature-editor');
  const button = card.querySelector<HTMLButtonElement>('.feature-save');

  if (name === undefined || host === null || button === null) {
    return;
  }

  const view = new EditorView({
    parent: host,
    doc: sourceOf(card),
    extensions: [basicSetup, gherkinLanguage, themeSlot.of(schemeTheme())],
  });

  mounted.push(view);
  button.addEventListener('click', () => {
    void save(name, view.state.doc.toString(), button);
  });
}

export function wireEditors(): void {
  const mounted: EditorView[] = [];

  for (const card of document.querySelectorAll<HTMLElement>('.feature-card')) {
    mountEditor(card, mounted);
  }

  document.addEventListener('ket-surface-shown', () => {
    for (const view of mounted) {
      view.requestMeasure();
    }
  });

  document.addEventListener('ket-surface-scheme', () => {
    for (const view of mounted) {
      view.dispatch({ effects: themeSlot.reconfigure(schemeTheme()) });
    }
  });
}
