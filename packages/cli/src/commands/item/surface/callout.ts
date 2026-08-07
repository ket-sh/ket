import type { DesignCallout as Callout } from '../../../shared/surface-doc.ts';
import type { Panel, RenderedDiagram } from './panel.ts';

import { calloutsOf } from '../../../shared/surface-doc.ts';
import { panelOf } from './panel.ts';
import { escaped } from './text.ts';

interface Marked {
  html: string;
  found: Callout[];
  missing: Callout[];
}

interface Anchor {
  x: number;
  y: number;
}

export interface CalloutLayer {
  prose: string;
  panel: Panel | undefined;
}

const TAG_SPLIT = /(<[^>]*>)/;

const HINT =
  '<p class="callout-hint">Hover a numbered claim to light its shape, hover a shape to light the claim.</p>';

const SWITCH =
  '<button type="button" class="callout-switch" aria-pressed="true">Callouts on</button>';

function shapeClass(shape: string): string {
  return btoa(shape);
}

function escapeRegex(raw: string): string {
  return raw.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function claimPattern(claim: string): RegExp {
  return new RegExp(escapeRegex(escaped(claim)).replaceAll(/\s+/g, String.raw`\s+`));
}

function markInText(
  html: string,
  pattern: RegExp,
  wrap: (text: string) => string,
): string | undefined {
  const pieces = html.split(TAG_SPLIT);

  for (const [index, piece] of pieces.entries()) {
    const found = index % 2 === 0 ? pattern.exec(piece) : null;

    if (found === null) {
      continue;
    }

    pieces[index] =
      piece.slice(0, found.index) + wrap(found[0]) + piece.slice(found.index + found[0].length);

    return pieces.join('');
  }

  return undefined;
}

function calloutSpan(order: number, shape: string, text: string): string {
  return `<span class="callout" data-callout-shape="${shapeClass(shape)}" tabindex="0">${text}<sup class="callout-marker">${String(order)}</sup></span>`;
}

function markCallouts(html: string, callouts: Callout[]): Marked {
  let current = html;
  const found: Callout[] = [];
  const missing: Callout[] = [];

  for (const callout of callouts) {
    const next = markInText(current, claimPattern(callout.claim), (text) =>
      calloutSpan(found.length + 1, callout.shape, text),
    );

    if (next === undefined) {
      missing.push(callout);
      continue;
    }

    current = next;
    found.push(callout);
  }

  return { html: current, found, missing };
}

function scopedApart(svg: string): string {
  const hash = /class="(d2-\d+) d2-svg"/.exec(svg)?.[1];

  return hash === undefined ? svg : svg.replaceAll(hash, `${hash}x`);
}

function finiteAnchor(x: number, y: number): Anchor | undefined {
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

function anchorOf(svg: string, cssClass: string): Anchor | undefined {
  const at = svg.indexOf(`class="${cssClass}"`);
  const rect = /<rect x="([\d.]+)" y="([\d.]+)"/.exec(svg.slice(at, at + 500));

  return rect === null ? undefined : finiteAnchor(Number(rect[1]), Number(rect[2]));
}

function badgeOf(order: number, cssClass: string, anchor: Anchor): string {
  return `<g class="callout-badge" data-callout-shape="${cssClass}"><circle cx="${String(anchor.x)}" cy="${String(anchor.y)}" r="26"></circle><text x="${String(anchor.x)}" y="${String(anchor.y + 11)}" text-anchor="middle">${String(order)}</text></g>`;
}

function withCalloutHooks(svg: string, callouts: Callout[]): string {
  let current = scopedApart(svg);
  const badges: string[] = [];

  for (const [index, callout] of callouts.entries()) {
    const cssClass = shapeClass(callout.shape);
    const anchor = anchorOf(current, cssClass);

    if (anchor === undefined) {
      continue;
    }

    current = current.replace(
      `class="${cssClass}"`,
      `class="${cssClass} callout-shape" data-callout-shape="${cssClass}"`,
    );
    badges.push(badgeOf(index + 1, cssClass, anchor));
  }

  const close = current.lastIndexOf('</svg></svg>');

  return close < 0
    ? current
    : `${current.slice(0, close)}<g class="callout-badges">${badges.join('')}</g>${current.slice(close)}`;
}

export function diagramFigure(diagram: RenderedDiagram, hook: string): string {
  const classes = hook === '' ? 'diagram' : `diagram ${hook}`;

  return `<div class="${classes}"><div class="diagram-scheme" data-diagram-scheme="light">${diagram.light}</div><div class="diagram-scheme" data-diagram-scheme="dark">${diagram.dark}</div></div>`;
}

function legendRow(order: number, callout: Callout): string {
  return `<li class="callout-legend-row" data-callout-shape="${shapeClass(callout.shape)}"><span class="callout-legend-number">${String(order)}</span><span class="callout-legend-shape">${escaped(callout.shape)}</span></li>`;
}

function missingNote(missing: Callout[]): string {
  if (missing.length === 0) {
    return '';
  }

  const claims = missing.map((callout) => `<code>${escaped(callout.claim)}</code>`);

  return `<p class="callout-missing">Not found in the prose: ${claims.join(', ')}</p>`;
}

export function calloutLayer(
  prose: string,
  callouts: string | undefined,
  diagram: RenderedDiagram | undefined,
): CalloutLayer {
  const claims = calloutsOf(callouts);

  if (claims.length === 0 || diagram === undefined) {
    return { prose, panel: undefined };
  }

  const marked = markCallouts(prose, claims);
  const legend = marked.found.map((callout, index) => legendRow(index + 1, callout));
  const hooked: RenderedDiagram = {
    light: withCalloutHooks(diagram.light, marked.found),
    dark: withCalloutHooks(diagram.dark, marked.found),
  };
  const body = `${diagramFigure(hooked, 'callout-diagram')}
<ol class="callout-legend">${legend.join('')}</ol>
${HINT}
${missingNote(marked.missing)}`;

  return {
    prose: marked.html,
    panel: panelOf('Diagram', body, { controls: SWITCH, frame: 'collapsible' }),
  };
}
