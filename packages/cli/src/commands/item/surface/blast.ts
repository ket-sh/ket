import type { Panel, RenderedDiagram } from './panel.ts';

import { diagramFigure } from './callout.ts';
import { panelOf } from './panel.ts';
import { escaped } from './text.ts';

export type BlastRender = { drawn: RenderedDiagram } | { complaint: string };

export interface BlastFiles {
  source: string;
  measure: string | undefined;
}

export type BlastArtifact = BlastFiles & { render: BlastRender };

interface BlastMeasure {
  base: string;
  measuredAt: string;
  collapse: number;
  budget: number;
  uncollapsedNodes: number;
  uncollapsedEdges: number;
}

function textAt(measure: object, field: string): string {
  const held: unknown = Reflect.get(measure, field);

  return typeof held === 'string' ? held : '';
}

function countAt(measure: object, field: string): number {
  const held: unknown = Reflect.get(measure, field);

  return typeof held === 'number' ? held : 0;
}

function recordOf(raw: string): object | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function measureOf(raw: string | undefined): BlastMeasure | undefined {
  const record = raw === undefined ? undefined : recordOf(raw);

  if (record === undefined) {
    return undefined;
  }

  return {
    base: textAt(record, 'base'),
    measuredAt: textAt(record, 'measuredAt'),
    collapse: countAt(record, 'collapse'),
    budget: countAt(record, 'budget'),
    uncollapsedNodes: countAt(record, 'uncollapsedNodes'),
    uncollapsedEdges: countAt(record, 'uncollapsedEdges'),
  };
}

const LINK_ICON = /<g transform="[^"]*" class="appendix-icon">[\s\S]*?<\/svg>\s*<\/g>/g;

function withoutLinks(svg: string): string {
  return svg
    .replaceAll(/\s(?:xlink:)?href="[^"]*"/g, '')
    .replaceAll(LINK_ICON, '')
    .replaceAll('fill="yellow"', 'fill="var(--blast-affected)" data-blast-affected="true"');
}

function countOf(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

function budgetNote(measure: BlastMeasure, nodes: number): string {
  return measure.uncollapsedNodes > measure.budget
    ? `Collapsed to ${String(measure.collapse)} path segments so ${String(nodes)} nodes stay inside the ${String(measure.budget)} node budget. The uncollapsed graph carries ${String(measure.uncollapsedNodes)} modules and ${String(measure.uncollapsedEdges)} edges.`
    : `No collapsing was needed: the uncollapsed graph already fits the ${String(measure.budget)} node budget.`;
}

function edgeNote(edges: number): string {
  return edges === 0
    ? ' No edge is drawn, because nothing else in the graph depends on the changed modules.'
    : '';
}

function unavailable(reason: string): Panel {
  return panelOf(
    'Blast radius',
    `<p class="measure-missing">measurement unavailable: ${escaped(reason)}</p>`,
    { frame: 'collapsible' },
  );
}

export function blastPanel(blast: BlastArtifact): Panel {
  const measure = measureOf(blast.measure);

  if (measure === undefined) {
    return unavailable('blast.json is missing or unreadable beside blast.d2');
  }

  if ('complaint' in blast.render) {
    return unavailable(`d2 refused the captured graph: ${blast.render.complaint}`);
  }

  const nodes = countOf(blast.source, /class: module/g);
  const edges = countOf(blast.source, / -> /g);
  const shown: RenderedDiagram = {
    light: withoutLinks(blast.render.drawn.light),
    dark: withoutLinks(blast.render.drawn.dark),
  };
  const body = `<p class="measure-line"><span class="measure-count">${String(nodes)} affected modules, ${String(edges)} edges</span><span class="measure-at">measured at ${escaped(measure.measuredAt)} against ${escaped(measure.base)}</span></p>
${diagramFigure(shown, 'blast-diagram')}
<p class="measure-budget">${escaped(budgetNote(measure, nodes))}${escaped(edgeNote(edges))}</p>`;

  return panelOf('Blast radius', body, { frame: 'collapsible' });
}
