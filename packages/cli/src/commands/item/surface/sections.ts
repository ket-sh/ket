import type { Panel } from './panel.ts';

import { diffBleed } from './fold.ts';
import { panelOf } from './panel.ts';
import { readingLayout } from './reading.ts';
import { escaped, scriptSafeJson } from './text.ts';

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

interface SectionChild {
  route: string;
  label: string;
  feature: string;
}

type SectionBody = { mode: 'masonry'; panels: Panel[] } | { mode: 'bleed'; bleed: string };

export type Section = SectionBody & {
  id: string;
  label: string;
  group: 'Design' | 'Verify';
  written: boolean;
  children: SectionChild[];
};

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

function featureCard(feature: FeatureFile): string {
  const name = escaped(feature.name);

  return `<article class="feature-card" data-feature="${name}"><header class="feature-card-head"><span class="feature-name">${name}</span><button type="button" class="feature-save" data-feature="${name}">Save</button></header><div class="feature-editor"></div><script type="application/json" class="feature-source">${scriptSafeJson(feature.source)}</script></article>`;
}

function criteriaBleed(features: FeatureFile[]): string {
  return features.length === 0
    ? '<p class="unwritten">Not written at this stage.</p>'
    : `<div class="feature-cards">${features.map(featureCard).join('')}</div>`;
}

function sectionOf(
  id: string,
  label: string,
  group: Section['group'],
  written: boolean,
  body: SectionBody & { children?: SectionChild[] },
): Section {
  const { children = [], ...rest } = body;

  return { id, label, group, written, children, ...rest };
}

function writtenProse(source: string | undefined): boolean {
  return source !== undefined && source.trim() !== '';
}

export function sectionsOf(artifacts: SurfaceArtifacts, sessionKey: string): Section[] {
  const change = artifacts.diff?.trim() ?? '';

  return [
    sectionOf('spec', 'Spec', 'Design', writtenProse(artifacts.spec), {
      mode: 'masonry',
      panels: [prosePanel('Spec', artifacts.spec)],
    }),
    sectionOf('design', 'Design', 'Design', writtenProse(artifacts.design), {
      mode: 'masonry',
      panels: [prosePanel('Design', artifacts.design), diagramPanel(artifacts.diagram)],
    }),
    sectionOf('decision', 'Decision', 'Design', writtenProse(artifacts.adr), {
      mode: 'masonry',
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
      mode: 'masonry',
      panels: [prosePanel('Brief', artifacts.brief)],
    }),
    sectionOf('diff', 'Diff', 'Verify', change !== '', {
      mode: 'bleed',
      bleed:
        change === ''
          ? '<p class="unwritten">No change to show at this stage.</p>'
          : diffBleed(change),
    }),
    sectionOf('findings', 'Findings', 'Verify', writtenProse(artifacts.findings), {
      mode: 'masonry',
      panels: [prosePanel('Findings', artifacts.findings)],
    }),
  ];
}
