import { describe, expect, it } from 'vitest';

import { calloutLayer } from './callout.ts';

const PROSE =
  '<div class="prose"><p>the cli assembles panels and the gate answers keyed requests</p></div>';

const LIGHT =
  '<svg class="d2-42 d2-svg"><style>.d2-42 .shape{fill:white}</style><svg width="600"><g class="Y2xp"><rect x="100" y="50" width="80" height="40"></rect></g><g class="Z2F0ZQ=="><rect x="300" y="200" width="80" height="40"></rect></g></svg></svg>';

const DARK =
  '<svg class="d2-42 d2-svg"><style>.d2-42 .shape{fill:black}</style><svg width="600"><g class="Y2xp"><rect x="100" y="50" width="80" height="40"></rect></g><g class="Z2F0ZQ=="><rect x="300" y="200" width="80" height="40"></rect></g></svg></svg>';

const DIAGRAM = { light: LIGHT, dark: DARK };

const CALLOUTS = JSON.stringify([
  { claim: 'assembles panels', shape: 'cli' },
  { claim: 'answers keyed requests', shape: 'gate' },
]);

describe('the layer without its inputs', () => {
  it('answers the prose untouched without callouts', () => {
    for (const callouts of [undefined, '[]', 'not json', '{"claim":"x"}']) {
      const layer = calloutLayer(PROSE, callouts, DIAGRAM);

      expect(layer.prose).toBe(PROSE);
      expect(layer.panel).toBeUndefined();
    }
  });

  it('answers the prose untouched without a diagram', () => {
    const layer = calloutLayer(PROSE, CALLOUTS, undefined);

    expect(layer.prose).toBe(PROSE);
    expect(layer.panel).toBeUndefined();
  });

  it('drops an entry missing its claim or its shape', () => {
    const partial = JSON.stringify([
      { claim: 'assembles panels' },
      { shape: 'gate' },
      { claim: '', shape: 'gate' },
      { claim: 'assembles panels', shape: '' },
      'noise',
    ]);
    const layer = calloutLayer(PROSE, partial, DIAGRAM);

    expect(layer.prose).toBe(PROSE);
    expect(layer.panel).toBeUndefined();
  });
});

describe('the claims the prose wears', () => {
  it('wraps each claim in declaration order with its shape and number', () => {
    const layer = calloutLayer(PROSE, CALLOUTS, DIAGRAM);

    expect(layer.prose).toBe(
      '<div class="prose"><p>the cli <span class="callout" data-callout-shape="Y2xp" tabindex="0">assembles panels<sup class="callout-marker">1</sup></span> and the gate <span class="callout" data-callout-shape="Z2F0ZQ==" tabindex="0">answers keyed requests<sup class="callout-marker">2</sup></span></p></div>',
    );
  });

  it('marks the text and never the markup carrying the same words', () => {
    const trap = '<div class="prose"><p data-note="assembles panels">assembles panels</p></div>';
    const layer = calloutLayer(trap, CALLOUTS, DIAGRAM);

    expect(layer.prose).toContain('data-note="assembles panels"');
    expect(layer.prose).toContain(
      '><span class="callout" data-callout-shape="Y2xp" tabindex="0">assembles panels<sup',
    );
  });

  it('reaches across whitespace folds between the claim words', () => {
    const folded = '<div class="prose"><p>the cli assembles\n   panels daily</p></div>';
    const layer = calloutLayer(folded, CALLOUTS, DIAGRAM);

    expect(layer.prose).toContain('>assembles\n   panels<sup');
  });

  it('forgives extra whitespace inside the declared claim', () => {
    const airy = JSON.stringify([{ claim: 'assembles  panels', shape: 'cli' }]);
    const layer = calloutLayer(PROSE, airy, DIAGRAM);

    expect(layer.prose).toContain('>assembles panels<sup class="callout-marker">1</sup>');
  });

  it('treats regex operators in a claim as plain text', () => {
    const spiky = JSON.stringify([{ claim: 'panels (all 12) cost $3+', shape: 'cli' }]);
    const prose = '<div class="prose"><p>the panels (all 12) cost $3+ today</p></div>';
    const layer = calloutLayer(prose, spiky, DIAGRAM);

    expect(layer.prose).toContain('>panels (all 12) cost $3+<sup class="callout-marker">1</sup>');
  });

  it('finds a claim the prose encoding escaped', () => {
    const spiky = JSON.stringify([{ claim: 'the "keyed" <gate> & co', shape: 'cli' }]);
    const escapedProse =
      '<div class="prose"><p>meet the &quot;keyed&quot; &lt;gate&gt; &amp; co here</p></div>';
    const layer = calloutLayer(escapedProse, spiky, DIAGRAM);

    expect(layer.prose).toContain(
      '>the &quot;keyed&quot; &lt;gate&gt; &amp; co<sup class="callout-marker">1</sup>',
    );
  });
});

describe('the shapes the diagram lights', () => {
  it('hooks the drawn shape and seats a numbered badge at its anchor', () => {
    const panel = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(panel?.body).toContain('<g class="Y2xp callout-shape" data-callout-shape="Y2xp">');
    expect(panel?.body).toContain(
      '<g class="callout-badge" data-callout-shape="Y2xp"><circle cx="100" cy="50" r="26"></circle><text x="100" y="61" text-anchor="middle">1</text></g>',
    );
    expect(panel?.body).toContain(
      '<g class="callout-badge" data-callout-shape="Z2F0ZQ=="><circle cx="300" cy="200" r="26"></circle><text x="300" y="211" text-anchor="middle">2</text></g>',
    );
  });

  it('seats the badges inside the closing frame of both schemes', () => {
    const body = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel?.body ?? '';

    expect(body.match(/<g class="callout-badges">/g)).toHaveLength(2);
    expect(body.match(/<\/svg><\/svg>/g)).toHaveLength(2);
    expect(body).toContain(
      '<g class="callout-badges"><g class="callout-badge" data-callout-shape="Y2xp">',
    );
    expect(body).toContain('</g><g class="callout-badge" data-callout-shape="Z2F0ZQ==">');
    expect(body).toContain('</text></g></g></svg></svg>');
    expect(body).not.toContain('</svg></svg><g class="callout-badges">');
  });

  it('suffixes the diagram hash so the hooked copy stays scoped', () => {
    const panel = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(panel?.body).toContain('class="d2-42x d2-svg"');
    expect(panel?.body).toContain('.d2-42x .shape');
    expect(panel?.body).not.toContain('"d2-42 d2-svg"');
  });

  it('marks the claim but seats no badge for a shape the diagram never drew', () => {
    const ghost = JSON.stringify([{ claim: 'assembles panels', shape: 'ghost' }]);
    const layer = calloutLayer(PROSE, ghost, DIAGRAM);

    expect(layer.prose).toContain('data-callout-shape="Z2hvc3Q="');
    expect(layer.panel?.body).not.toContain('callout-badge"');
  });

  it('wears both schemes under the callout hook', () => {
    const panel = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(panel?.body).toContain(
      '<div class="diagram callout-diagram"><div class="diagram-scheme" data-diagram-scheme="light">',
    );
    expect(panel?.body).toContain('<div class="diagram-scheme" data-diagram-scheme="dark">');
    expect(panel?.body).toContain('fill:black');
  });
});

describe('the anchors the badges refuse', () => {
  it('leaves a diagram without a closing frame badge free', () => {
    const flat = {
      light: '<svg class="d2-7 d2-svg"><g class="Y2xp"><rect x="10" y="20"></rect></g></svg>',
      dark: '<svg class="d2-7 d2-svg"><g class="Y2xp"><rect x="10" y="20"></rect></g></svg>',
    };
    const panel = calloutLayer(PROSE, CALLOUTS, flat).panel;

    expect(panel?.body).toContain('callout-shape');
    expect(panel?.body).not.toContain('callout-badges');
  });

  it('seats the badge group even at the frame edge', () => {
    const edge = { light: '</svg></svg>', dark: '</svg></svg>' };
    const panel = calloutLayer(PROSE, CALLOUTS, edge).panel;

    expect(panel?.body).toContain('<g class="callout-badges"></g></svg></svg>');
  });

  it('seats no badge on a malformed anchor', () => {
    const broken = {
      light:
        '<svg class="d2-7 d2-svg"><svg><g class="Y2xp"><rect x=".." y="20"></rect></g><g class="Z2F0ZQ=="><rect x="10" y=".."></rect></g></svg></svg>',
      dark: '<svg class="d2-7 d2-svg"><svg><g class="Y2xp"><rect x=".." y="20"></rect></g><g class="Z2F0ZQ=="><rect x="10" y=".."></rect></g></svg></svg>',
    };
    const panel = calloutLayer(PROSE, CALLOUTS, broken).panel;

    expect(panel?.body).not.toContain('callout-badge"');
  });
});

describe('the legend and the losses', () => {
  it('lists each marked claim by number and shape name', () => {
    const panel = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(panel?.body).toContain(
      '<ol class="callout-legend"><li class="callout-legend-row" data-callout-shape="Y2xp"><span class="callout-legend-number">1</span><span class="callout-legend-shape">cli</span></li><li class="callout-legend-row" data-callout-shape="Z2F0ZQ=="><span class="callout-legend-number">2</span><span class="callout-legend-shape">gate</span></li></ol>',
    );
  });

  it('teaches the hover in one hint line', () => {
    expect(calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel?.body).toContain(
      '<p class="callout-hint">Hover a numbered claim to light its shape, hover a shape to light the claim.</p>',
    );
  });

  it('names the claims the prose lost and keeps quiet when none are', () => {
    const half = JSON.stringify([
      { claim: 'assembles panels', shape: 'cli' },
      { claim: 'never written words', shape: 'gate' },
      { claim: 'also absent here', shape: 'cli' },
    ]);
    const lost = calloutLayer(PROSE, half, DIAGRAM).panel;
    const whole = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(lost?.body).toContain(
      '<p class="callout-missing">Not found in the prose: <code>never written words</code>, <code>also absent here</code></p>',
    );
    expect(whole?.body).not.toContain('callout-missing');
    expect(whole?.body.trim().endsWith('hover a shape to light the claim.</p>')).toBe(true);
  });
});

describe('the panel the layer folds', () => {
  it('collapses behind the Diagram head wearing the switch', () => {
    const panel = calloutLayer(PROSE, CALLOUTS, DIAGRAM).panel;

    expect(panel?.label).toBe('Diagram');
    expect(panel?.frame).toBe('collapsible');
    expect(panel?.controls).toBe(
      '<button type="button" class="callout-switch" aria-pressed="true">Callouts on</button>',
    );
  });
});
