import type { BlastArtifact } from './blast.ts';
import type { Panel } from './panel.ts';

import { plainState } from '../plain/state.ts';
import { audiencePanel } from './audience.ts';
import { blastPanel } from './blast.ts';
import { calloutLayer, diagramFigure } from './callout.ts';
import { diffBleed } from './fold.ts';
import { driverMatrix, withoutMatrixLines } from './matrix.ts';
import { UNWRITTEN, panelOf } from './panel.ts';
import { readingLayout } from './reading.ts';
import { escaped, scriptSafeJson } from './text.ts';

export type { RenderedDiagram } from './panel.ts';

import type { RenderedDiagram } from './panel.ts';

interface FeatureFile {
  name: string;
  source: string;
}

interface SurfaceArtifacts {
  spec?: string | undefined;
  specPlain?: string | undefined;
  design?: string | undefined;
  designPlain?: string | undefined;
  adr?: string | undefined;
  adrPlain?: string | undefined;
  callouts?: string | undefined;
  blast?: BlastArtifact | undefined;
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

const LAG_NOTE = 'Plain version lags behind its source.';

function plainNote(technical: string | undefined, plain: string | undefined): string {
  const lags =
    plain !== undefined && (technical === undefined || plainState(technical, plain) === 'stale');

  return lags ? LAG_NOTE : '';
}

function audienceProse(
  label: string,
  group: string,
  technical: string | undefined,
  plain: string | undefined,
): Panel {
  return audiencePanel(
    label,
    group,
    readingLayout(technical ?? ''),
    readingLayout(plain ?? ''),
    plainNote(technical, plain),
  );
}

function decisionPanels(adr: string | undefined, plain: string | undefined): Panel[] {
  const source = adr ?? '';
  const prose = audiencePanel(
    'Decision',
    'decision',
    readingLayout(withoutMatrixLines(source)),
    readingLayout(plain ?? ''),
    plainNote(adr, plain),
  );
  const matrix = driverMatrix(source);

  return matrix === undefined ? [prose] : [prose, matrix];
}

function diagramPanel(diagram: RenderedDiagram | undefined): Panel {
  const body = diagram === undefined ? '' : diagramFigure(diagram, '');

  return panelOf('Diagram', body, { frame: 'collapsible' });
}

function designPanels(artifacts: SurfaceArtifacts): Panel[] {
  const prose = readingLayout(artifacts.design ?? '');
  const layer = calloutLayer(prose, artifacts.callouts, artifacts.diagram);
  const panel = audiencePanel(
    'Design',
    'design',
    layer.prose,
    readingLayout(artifacts.designPlain ?? ''),
    plainNote(artifacts.design, artifacts.designPlain),
  );

  return [panel, layer.panel ?? diagramPanel(artifacts.diagram)];
}

function featureCard(feature: FeatureFile): string {
  const name = escaped(feature.name);

  return `<article class="feature-card" data-feature="${name}"><header class="feature-card-head"><span class="feature-name">${name}</span><button type="button" class="feature-save" data-feature="${name}">Save</button></header><div class="feature-editor"></div><script type="application/json" class="feature-source">${scriptSafeJson(feature.source)}</script></article>`;
}

function criteriaBleed(features: FeatureFile[]): string {
  return features.length === 0
    ? UNWRITTEN
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

const FORMAT_SWITCH =
  '<span class="diff-format" role="group" aria-label="Diff layout"><button type="button" class="diff-format-option is-selected" data-diff-format="unified">Unified</button><button type="button" class="diff-format-option" data-diff-format="side">Side by side</button></span>';

function blastBody(blast: BlastArtifact | undefined): Panel {
  return blast === undefined ? panelOf('Blast radius', '') : blastPanel(blast);
}

function diffPanels(change: string): Panel[] {
  const body =
    change === '' ? '<p class="unwritten">No change to show at this stage.</p>' : diffBleed(change);

  return [
    panelOf('Diff', body, {
      controls: FORMAT_SWITCH,
      hook: 'diff-panel',
      width: 'full',
      height: 'viewport',
    }),
  ];
}

export function sectionsOf(artifacts: SurfaceArtifacts, sessionKey: string): Section[] {
  const change = artifacts.diff?.trim() ?? '';

  return [
    sectionOf('spec', 'Spec', 'Design', writtenProse(artifacts.spec), {
      mode: 'masonry',
      panels: [audienceProse('Spec', 'spec', artifacts.spec, artifacts.specPlain)],
    }),
    sectionOf('design', 'Design', 'Design', writtenProse(artifacts.design), {
      mode: 'masonry',
      panels: designPanels(artifacts),
    }),
    sectionOf('decision', 'Decision', 'Design', writtenProse(artifacts.adr), {
      mode: 'masonry',
      panels: decisionPanels(artifacts.adr, artifacts.adrPlain),
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
    sectionOf('blast', 'Blast Radius', 'Verify', artifacts.blast !== undefined, {
      mode: 'masonry',
      panels: [blastBody(artifacts.blast)],
    }),
    sectionOf('diff', 'Diff', 'Verify', change !== '', {
      mode: 'masonry',
      panels: diffPanels(change),
    }),
    sectionOf('findings', 'Findings', 'Verify', writtenProse(artifacts.findings), {
      mode: 'masonry',
      panels: [prosePanel('Findings', artifacts.findings)],
    }),
  ];
}
