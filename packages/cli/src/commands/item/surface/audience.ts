import type { Panel } from './panel.ts';

import { UNWRITTEN, panelOf } from './panel.ts';

const NO_PLAIN = 'No plain version written.';

function noteMarkup(note: string): string {
  return note === '' ? '' : `<span class="audience-note">${note}</span>`;
}

function plainOption(plain: string, note: string): string {
  if (plain === '') {
    return `<button type="button" class="audience-option is-dimmed" data-audience="plain" disabled aria-disabled="true">Plain language</button><span class="audience-note">${NO_PLAIN}</span>`;
  }

  return `<button type="button" class="audience-option" data-audience="plain">Plain language</button>${noteMarkup(note)}`;
}

function audienceSwitch(group: string, plain: string, note: string): string {
  return `<span class="audience-switch" data-audience-group="${group}"><button type="button" class="audience-option is-selected" data-audience="technical">Technical</button>${plainOption(plain, note)}</span>`;
}

function variants(group: string, technical: string, plain: string): string {
  const technicalShown = technical === '' ? UNWRITTEN : technical;
  const plainShown = plain === '' ? `<p class="unwritten">${NO_PLAIN}</p>` : plain;

  return `<div class="audience-variants" data-audience-group="${group}"><div class="audience-variant is-active" data-audience="technical">${technicalShown}</div><div class="audience-variant" data-audience="plain">${plainShown}</div></div>`;
}

export function audiencePanel(
  label: string,
  group: string,
  technical: string,
  plain: string,
  note: string,
): Panel {
  return panelOf(label, variants(group, technical, plain), {
    controls: audienceSwitch(group, plain, note),
  });
}
