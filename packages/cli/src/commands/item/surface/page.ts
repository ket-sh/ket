import type { Section } from './sections.ts';

import { sidebarGlyph, surfaceBootstrap, themeScript, themeSwitch } from './client.ts';
import { masonry } from './panel.ts';
import { sectionsOf } from './sections.ts';
import { escaped } from './text.ts';

export type { ItemSurface, RenderedDiagram } from './sections.ts';

import type { ItemSurface } from './sections.ts';

export interface SurfaceOptions {
  sessionKey: string;
  styles?: string;
}

const STAGES: readonly string[] = [
  'triaged',
  'designing',
  'awaiting-approval',
  'implementing',
  'verifying',
  'awaiting-merge',
  'shipped',
];

const DEFAULT_SECTION_BY_STAGE: Record<string, string> = {
  triaged: 'design',
  designing: 'design',
  'awaiting-approval': 'design',
  implementing: 'change',
  verifying: 'change',
  'awaiting-merge': 'change',
  shipped: 'change',
};

const DONE_TICK =
  '<svg class="stage-tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 6.3 5 8.7 9.4 3.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function stageState(stage: string, current: string): string {
  if (STAGES.indexOf(stage) < STAGES.indexOf(current)) {
    return 'is-done';
  }

  return stage === current ? 'is-current' : 'is-ahead';
}

function stepper(current: string): string {
  const nodes = STAGES.map((stage) => {
    const state = stageState(stage, current);
    const dot = state === 'is-done' ? DONE_TICK : '';

    return `<li class="stage ${state}" data-stage="${stage}"><span class="stage-dot">${dot}</span><span class="stage-name">${stage}</span></li>`;
  });

  return `<ol class="stepper">${nodes.join('')}</ol>`;
}

function navChildren(section: Section): string {
  if (section.children.length === 0) {
    return '';
  }

  const links = section.children.map(
    (child) =>
      `<a class="nav-child" href="#${escaped(child.route)}" data-route="${escaped(child.route)}" data-feature="${escaped(child.feature)}">${escaped(child.label)}</a>`,
  );

  return `<div class="nav-children">${links.join('')}</div>`;
}

function navGroup(group: Section['group'], sections: Section[], selected: string): string {
  const links = sections
    .filter((entry) => entry.group === group)
    .map((entry) => {
      const empty = entry.written ? '' : ' is-empty';
      const active = entry.id === selected ? ' is-selected' : '';
      const item = `<a class="nav-item${empty}${active}" href="#${entry.id}" data-section="${entry.id}">${entry.label}</a>`;

      return item + navChildren(entry);
    });

  return `<p class="nav-group">${group}</p>${links.join('')}`;
}

function sectionBody(section: Section): string {
  return section.mode === 'bleed' ? section.bleed : masonry(section.panels);
}

function routesOf(sections: Section[]): Record<string, { section: string; feature: string }> {
  return Object.fromEntries(
    sections.flatMap((entry) =>
      entry.children.map((child): [string, { section: string; feature: string }] => [
        child.route,
        { section: entry.id, feature: child.feature },
      ]),
    ),
  );
}

function firstRoutesOf(sections: Section[]): Record<string, string> {
  return Object.fromEntries(
    sections.flatMap((entry): [string, string][] => {
      const first = entry.children[0];

      return first === undefined ? [] : [[entry.id, first.route]];
    }),
  );
}

export function assemblePage(item: ItemSurface, options: SurfaceOptions): string {
  const sections = sectionsOf(item.artifacts, options.sessionKey);
  const selected = DEFAULT_SECTION_BY_STAGE[item.status] ?? 'design';
  const routes = routesOf(sections);
  const firstRouteOf = firstRoutesOf(sections);
  const bodies = sections
    .map((entry) => {
      const active = entry.id === selected ? ' is-active' : '';

      return `<section class="section is-${entry.mode}${active}" id="section-${entry.id}" data-section="${entry.id}">${sectionBody(entry)}</section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en" data-default-section="${selected}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped(item.key)} · ${escaped(item.title)} · ${escaped(item.status)}</title>
${themeScript}
<style>${options.styles ?? ''}</style>
</head>
<body>
<header class="page-header">
  <div class="item-identity"><button type="button" class="nav-toggle" aria-controls="page-nav" aria-expanded="true" aria-label="Toggle navigation" title="Toggle navigation">${sidebarGlyph}</button><span class="logotype">ket</span><span class="item-key">${escaped(item.key)}</span><span class="item-title">${escaped(item.title)}</span></div>
  ${stepper(item.status)}
  ${themeSwitch}
</header>
<nav class="page-nav" id="page-nav">
  ${navGroup('Design', sections, selected)}
  ${navGroup('Verify', sections, selected)}
</nav>
<main class="page-content">
${bodies}
</main>
<script src="/gridstack.js?key=${options.sessionKey}"></script>
${surfaceBootstrap(options.sessionKey, item.key, selected, routes, firstRouteOf)}
</body>
</html>`;
}
