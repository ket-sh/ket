import type { Panel } from './panel.ts';

import { sidebarGlyph, surfaceBootstrap, themeScript, themeSwitch } from './client.ts';
import { diffBleed } from './fold.ts';
import { masonry, panelOf } from './panel.ts';
import { readingLayout } from './reading.ts';
import { escaped } from './text.ts';

export interface RenderedDiagram {
  light: string;
  dark: string;
}

interface FeatureFile {
  name: string;
  source: string;
}

interface SurfaceArtifacts {
  spec?: string | undefined;
  design?: string | undefined;
  adr?: string | undefined;
  brief?: string | undefined;
  findings?: string | undefined;
  diagram?: RenderedDiagram | undefined;
  diff?: string | undefined;
  features: FeatureFile[];
}

export interface ItemSurface {
  key: string;
  title: string;
  status: string;
  artifacts: SurfaceArtifacts;
}

export interface SurfaceOptions {
  sessionKey: string;
  styles?: string;
}

interface SectionChild {
  route: string;
  label: string;
  feature: string;
}

interface Section {
  id: string;
  label: string;
  group: 'Design' | 'Verify';
  mode: 'masonry' | 'bleed';
  written: boolean;
  panels: Panel[];
  bleed: string;
  children: SectionChild[];
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
  if (stage === current) {
    return 'is-current';
  }

  return STAGES.indexOf(stage) < STAGES.indexOf(current) ? 'is-done' : 'is-ahead';
}

function stepper(current: string): string {
  const nodes = STAGES.map((stage) => {
    const state = stageState(stage, current);
    const dot = state === 'is-done' ? DONE_TICK : '';

    return `<li class="stage ${state}" data-stage="${stage}"><span class="stage-dot">${dot}</span><span class="stage-name">${stage}</span></li>`;
  });

  return `<ol class="stepper">${nodes.join('')}</ol>`;
}

function prosePanel(label: string, source: string | undefined): Panel {
  return panelOf(label, readingLayout(source ?? ''));
}

function diagramPanel(diagram: RenderedDiagram | undefined): Panel {
  const body =
    diagram === undefined
      ? ''
      : `<figure class="diagram"><div class="diagram-light">${diagram.light}</div><div class="diagram-dark">${diagram.dark}</div></figure>`;

  return panelOf('Diagram', body, { frame: 'collapsible' });
}

function criteriaBleed(features: FeatureFile[]): string {
  return features
    .map(
      (feature) =>
        `<article class="feature" data-feature="${escaped(feature.name)}"><pre>${escaped(feature.source)}</pre></article>`,
    )
    .join('');
}

function sectionOf(
  id: string,
  label: string,
  group: Section['group'],
  written: boolean,
  shape: Partial<Section> = {},
): Section {
  return {
    id,
    label,
    group,
    mode: 'masonry',
    written,
    panels: [],
    bleed: '',
    children: [],
    ...shape,
  };
}

function writtenProse(source: string | undefined): boolean {
  return source !== undefined && source.trim() !== '';
}

function sectionsOf(artifacts: SurfaceArtifacts, sessionKey: string): Section[] {
  const change = artifacts.diff?.trim() ?? '';

  return [
    sectionOf('spec', 'Spec', 'Design', writtenProse(artifacts.spec), {
      panels: [prosePanel('Spec', artifacts.spec)],
    }),
    sectionOf('design', 'Design', 'Design', writtenProse(artifacts.design), {
      panels: [prosePanel('Design', artifacts.design), diagramPanel(artifacts.diagram)],
    }),
    sectionOf('decision', 'Decision', 'Design', writtenProse(artifacts.adr), {
      panels: [prosePanel('Decision', artifacts.adr)],
    }),
    sectionOf('criteria', 'Criteria', 'Design', artifacts.features.length > 0, {
      mode: 'bleed',
      bleed: criteriaBleed(artifacts.features),
      children: artifacts.features.map((feature) => ({
        route: `criteria/${feature.name}`,
        label: feature.name,
        feature: feature.name,
      })),
    }),
    sectionOf('wireframe', 'Wireframe', 'Design', true, {
      mode: 'bleed',
      bleed: `<iframe class="wireframe" src="/wireframe?key=${sessionKey}" title="Wireframe"></iframe>`,
    }),
    sectionOf('change', 'Change', 'Verify', writtenProse(artifacts.brief), {
      panels: [prosePanel('Brief', artifacts.brief)],
    }),
    sectionOf('diff', 'Diff', 'Verify', change !== '', {
      mode: 'bleed',
      bleed: change === '' ? '' : diffBleed(change),
    }),
    sectionOf('findings', 'Findings', 'Verify', writtenProse(artifacts.findings), {
      panels: [prosePanel('Findings', artifacts.findings)],
    }),
  ];
}

function navChildren(section: Section, shownRoute: string): string {
  if (section.children.length === 0) {
    return '';
  }

  const links = section.children.map((child) => {
    const active = child.route === shownRoute ? ' is-selected' : '';

    return `<a class="nav-child${active}" href="#${escaped(child.route)}" data-route="${escaped(child.route)}" data-feature="${escaped(child.feature)}">${escaped(child.label)}</a>`;
  });

  return `<div class="nav-children">${links.join('')}</div>`;
}

function navGroup(
  group: Section['group'],
  sections: Section[],
  selected: string,
  shownRoute: string,
): string {
  const links = sections
    .filter((entry) => entry.group === group)
    .map((entry) => {
      const empty = entry.written ? '' : ' is-empty';
      const active = entry.id === selected ? ' is-selected' : '';
      const item = `<a class="nav-item${empty}${active}" href="#${entry.id}" data-section="${entry.id}">${entry.label}</a>`;

      return item + navChildren(entry, entry.id === selected ? shownRoute : '');
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
  const shownRoute = firstRouteOf[selected] ?? '';
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
<title>${escaped(item.key)} · ${escaped(item.title)} · ${item.status}</title>
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
  ${navGroup('Design', sections, selected, shownRoute)}
  ${navGroup('Verify', sections, selected, shownRoute)}
</nav>
<main class="page-content">
${bodies}
</main>
<script src="/gridstack.js?key=${options.sessionKey}"></script>
${surfaceBootstrap(options.sessionKey, item.key, selected, routes, firstRouteOf)}
</body>
</html>`;
}
