import { describe, expect, it } from 'vitest';

import type { BlastArtifact } from './blast.ts';

import { blastPanel } from './blast.ts';

const SOURCE = [
  'direction: right',
  'a: { class: module }',
  'b: { class: module }',
  'a -> b',
  '',
].join('\n');

const MEASURE = JSON.stringify({
  base: 'main~1',
  measuredAt: 'abc123',
  collapse: 3,
  budget: 20,
  uncollapsedNodes: 99,
  uncollapsedEdges: 221,
});

const SVG =
  '<svg><a href="https://d2lang.com"><rect fill="yellow"></rect></a><g xlink:href="#a"></g></svg>';

function blastOf(overrides: Partial<BlastArtifact> = {}): BlastArtifact {
  return {
    source: SOURCE,
    measure: MEASURE,
    render: { drawn: { light: SVG, dark: SVG } },
    ...overrides,
  };
}

describe('the measurement the blast panel refuses', () => {
  it('says the measurement file is missing', () => {
    const panel = blastPanel(blastOf({ measure: undefined }));

    expect(panel.label).toBe('Blast radius');
    expect(panel.frame).toBe('collapsible');
    expect(panel.body).toBe(
      '<p class="measure-missing">measurement unavailable: blast.json is missing or unreadable beside blast.d2</p>',
    );
  });

  it('says the same for a measurement that never parses', () => {
    for (const measure of ['not json', '"a string"', '[]', '3']) {
      expect(blastPanel(blastOf({ measure })).body).toContain('measure-missing');
    }
  });

  it('carries the renderer complaint when d2 refused the graph', () => {
    const panel = blastPanel(blastOf({ render: { complaint: 'the graph <wound>' } }));

    expect(panel.body).toBe(
      '<p class="measure-missing">measurement unavailable: d2 refused the captured graph: the graph &lt;wound&gt;</p>',
    );
  });
});

describe('the measure line the blast panel reads', () => {
  it('counts the affected modules and edges out of the captured source', () => {
    expect(blastPanel(blastOf()).body).toContain(
      '<p class="measure-line"><span class="measure-count">2 affected modules, 1 edges</span><span class="measure-at">measured at abc123 against main~1</span></p>',
    );
  });

  it('reads an empty record as zeroes and empty names', () => {
    const panel = blastPanel(blastOf({ measure: '{}' }));

    expect(panel.body).toContain('<span class="measure-at">measured at  against </span>');
    expect(panel.body).toContain('fits the 0 node budget.');
  });

  it('keeps a hostile base and commit inert', () => {
    const measure = JSON.stringify({ base: '<b>x</b>', measuredAt: '<i>y</i>' });

    expect(blastPanel(blastOf({ measure })).body).toContain(
      'measured at &lt;i&gt;y&lt;/i&gt; against &lt;b&gt;x&lt;/b&gt;',
    );
  });
});

describe('the notes the budget writes', () => {
  it('explains the collapse when the graph outgrew the budget', () => {
    expect(blastPanel(blastOf()).body).toContain(
      '<p class="measure-budget">Collapsed to 3 path segments so 2 nodes stay inside the 20 node budget. The uncollapsed graph carries 99 modules and 221 edges.</p>',
    );
  });

  it('says no collapsing was needed when the graph already fits', () => {
    const measure = JSON.stringify({ base: 'b', measuredAt: 'm', budget: 20, uncollapsedNodes: 2 });

    expect(blastPanel(blastOf({ measure })).body).toContain(
      'No collapsing was needed: the uncollapsed graph already fits the 20 node budget.',
    );
  });

  it('explains a lonely change drawing no edge', () => {
    const alone = 'a: { class: module }\n';
    const panel = blastPanel(blastOf({ source: alone }));

    expect(panel.body).toContain(
      ' No edge is drawn, because nothing else in the graph depends on the changed modules.',
    );
    expect(blastPanel(blastOf()).body).not.toContain('No edge is drawn');
  });
});

describe('the diagram the blast panel cleans', () => {
  it('strips every link and recolors the affected fill, leaving no trace', () => {
    const body = blastPanel(blastOf()).body;

    expect(body).not.toContain('href=');
    expect(body).toContain(
      '<svg><a><rect fill="var(--blast-affected)" data-blast-affected="true"></rect></a><g></g></svg>',
    );
  });

  it('removes the appendix icons and nothing between them', () => {
    const withIcons =
      '<svg><g transform="t(1)" class="appendix-icon"><svg>\ni\n</svg>\n</g><circle r="4"></circle><g transform="t(2)" class="appendix-icon"><svg>j</svg></g></svg>';
    const panel = blastPanel(blastOf({ render: { drawn: { light: withIcons, dark: withIcons } } }));

    expect(panel.body).not.toContain('appendix-icon');
    expect(panel.body).toContain('<svg><circle r="4"></circle></svg>');
  });

  it('wears both schemes under the blast hook of a collapsible panel', () => {
    const panel = blastPanel(blastOf());

    expect(panel.label).toBe('Blast radius');
    expect(panel.frame).toBe('collapsible');
    expect(panel.body).toContain(
      '<div class="diagram blast-diagram"><div class="diagram-scheme" data-diagram-scheme="light">',
    );
  });
});
