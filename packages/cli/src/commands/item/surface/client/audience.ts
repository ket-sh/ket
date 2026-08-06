const AUDIENCE_STORE = 'ket-surface-audience';

function switchFor(group: string | undefined): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.audience-switch[data-audience-group="${String(group)}"]`,
  );
}

function offered(buttons: HTMLElement | null, wanted: string | null): boolean {
  if (buttons === null) {
    return false;
  }

  const option = buttons.querySelector<HTMLButtonElement>(`[data-audience="${String(wanted)}"]`);

  return option !== null && !option.disabled;
}

function paintGroup(variants: HTMLElement, wanted: string | null): void {
  const buttons = switchFor(variants.dataset['audienceGroup']);
  const target = offered(buttons, wanted) ? wanted : 'technical';

  for (const variant of variants.querySelectorAll<HTMLElement>('.audience-variant')) {
    variant.classList.toggle('is-active', variant.dataset['audience'] === target);
  }

  if (buttons !== null) {
    for (const node of buttons.querySelectorAll<HTMLButtonElement>('.audience-option')) {
      node.classList.toggle('is-selected', node.dataset['audience'] === target);
    }
  }
}

function showAudience(wanted: string | null): void {
  for (const variants of document.querySelectorAll<HTMLElement>('.audience-variants')) {
    paintGroup(variants, wanted);
  }
}

export function wireAudience(): void {
  showAudience(localStorage.getItem(AUDIENCE_STORE));

  for (const node of document.querySelectorAll<HTMLButtonElement>('.audience-option')) {
    node.addEventListener('click', () => {
      if (node.disabled) {
        return;
      }

      const audience = node.dataset['audience'] ?? 'technical';

      localStorage.setItem(AUDIENCE_STORE, audience);
      showAudience(audience);
    });
  }
}
