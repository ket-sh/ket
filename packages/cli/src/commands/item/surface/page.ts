import { readingLayout } from './reading.ts';
import { surfaceBoot, surfaceStyle, surfaceWiring } from './style.ts';

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
}

interface Section {
  id: string;
  label: string;
  written: boolean;
  body: string;
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

const DESIGN_STAGES = new Set(['designing', 'awaiting-approval']);

const escaped = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function defaultSection(status: string, artifacts: SurfaceArtifacts): string {
  if (status === 'triaged') {
    return 'spec';
  }

  if (DESIGN_STAGES.has(status)) {
    return 'design';
  }

  return artifacts.brief === undefined ? 'design' : 'change';
}

function stepper(status: string): string {
  const current = STAGES.indexOf(status);
  const nodes = STAGES.map((stage, position) => {
    const state = position === current ? 'is-current' : position < current ? 'is-done' : 'is-next';

    return `<li class="stage ${state}" data-stage="${stage}">${stage}</li>`;
  });

  return `<ol class="stepper">${nodes.join('')}</ol>`;
}

function proseSection(id: string, label: string, source: string | undefined): Section {
  return {
    id,
    label,
    written: source !== undefined && source.trim() !== '',
    body: readingLayout(source ?? ''),
  };
}

function criteriaSection(features: FeatureFile[]): Section {
  const cards = features.map(
    (feature) =>
      `<article class="feature" data-feature="${escaped(feature.name)}"><pre>${escaped(feature.source)}</pre></article>`,
  );

  return {
    id: 'criteria',
    label: 'Criteria',
    written: features.length > 0,
    body: cards.join(''),
  };
}

function wireframeSection(sessionKey: string): Section {
  return {
    id: 'wireframe',
    label: 'Wireframe',
    written: true,
    body: `<iframe class="wireframe" src="/wireframe?key=${sessionKey}"></iframe>`,
  };
}

function diagramSection(diagram: RenderedDiagram | undefined): Section {
  const body =
    diagram === undefined
      ? ''
      : `<figure class="diagram"><div class="diagram-light">${diagram.light}</div><div class="diagram-dark">${diagram.dark}</div></figure>`;

  return { id: 'architecture', label: 'Architecture', written: diagram !== undefined, body };
}

function sectionsOf(artifacts: SurfaceArtifacts, sessionKey: string): Section[] {
  return [
    proseSection('spec', 'Spec', artifacts.spec),
    proseSection('design', 'Design', artifacts.design),
    diagramSection(artifacts.diagram),
    proseSection('decision', 'Decision', artifacts.adr),
    criteriaSection(artifacts.features),
    wireframeSection(sessionKey),
    proseSection('change', 'Change', artifacts.brief),
    proseSection('findings', 'Findings', artifacts.findings),
  ];
}

function navEntry(section: Section, features: FeatureFile[]): string {
  const dimmed = section.written ? '' : ' is-dimmed';
  const entry = `<a data-section="${section.id}" class="nav-entry${dimmed}" href="#${section.id}">${section.label}</a>`;

  if (section.id !== 'criteria') {
    return entry;
  }

  const children = features.map(
    (feature) =>
      `<a class="nav-child" data-feature="${escaped(feature.name)}" href="#criteria">${escaped(feature.name)}</a>`,
  );

  return `${entry}${children.join('')}`;
}

function sectionShell(section: Section): string {
  const missing = section.written
    ? section.body
    : '<p class="not-written">Not written at this stage.</p>';

  return `<section id="section-${section.id}" class="surface-section">${missing}</section>`;
}

function themeSwitch(): string {
  const choices = ['system', 'dark', 'light'].map(
    (choice) => `<button type="button" data-theme-choice="${choice}">${choice}</button>`,
  );

  return `<div class="theme-switch">${choices.join('')}</div>`;
}

export function assemblePage(item: ItemSurface, options: SurfaceOptions): string {
  const sections = sectionsOf(item.artifacts, options.sessionKey);
  const nav = sections.map((section) => navEntry(section, item.artifacts.features));
  const bodies = sections.map(sectionShell);

  return `<!doctype html>
<html lang="en" data-default-section="${defaultSection(item.status, item.artifacts)}">
<head>
<meta charset="utf-8">
<title>${escaped(item.key)} · ${escaped(item.title)}</title>
<style>${surfaceStyle}</style>
<script>${surfaceBoot}</script>
</head>
<body>
<header class="surface-header">
<span class="wordmark">ket</span>
<span class="item-key">${escaped(item.key)}</span>
<h1 class="item-title">${escaped(item.title)}</h1>
${themeSwitch()}
</header>
${stepper(item.status)}
<div class="surface-frame">
<nav class="surface-nav">${nav.join('')}</nav>
<main class="surface-main">${bodies.join('')}</main>
</div>
<script>${surfaceWiring}</script>
<script type="module" src="/surface.js?key=${options.sessionKey}"></script>
<script>new WebSocket(\`ws://\${location.host}/ws?key=${options.sessionKey}\`).onmessage = () => location.reload();</script>
</body>
</html>`;
}
