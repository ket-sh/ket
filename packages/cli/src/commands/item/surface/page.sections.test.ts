import { describe, expect, it } from 'vitest';

import type { ItemSurface } from './page.ts';

import { assemblePage } from './page.ts';

const KEY = 'the-test-session-key-000000000';

const CHANGE = [
  'diff --git a/src/app.ts b/src/app.ts',
  'index 1111111..2222222 100644',
  '--- a/src/app.ts',
  '+++ b/src/app.ts',
  '@@ -1,2 +1,2 @@',
  '-const answer = 1;',
  '+const answer = 2;',
  '',
].join('\n');

function surfaceOf(overrides: Partial<ItemSurface> = {}): ItemSurface {
  return {
    key: 'RL-2',
    title: 'Replace welcome scaffold with landing page shell',
    status: 'verifying',
    artifacts: {
      spec: '# The spec\n\nShort.',
      design: '# The design\n\nShort.',
      adr: '# The record\n\nShort.',
      brief: '# The brief\n\nShort.',
      findings: '# The findings\n\nShort.',
      features: [
        { name: 'brand-colors.feature', source: 'Feature: Brand colors\n' },
        { name: 'landing-shell.feature', source: 'Feature: Landing shell\n' },
      ],
      ...overrides.artifacts,
    },
    ...overrides,
  };
}

function pageOf(overrides: Partial<ItemSurface> = {}): string {
  return assemblePage(surfaceOf(overrides), { sessionKey: KEY });
}

function sectionMarkup(page: string, id: string): string {
  const start = page.indexOf(`id="section-${id}"`);

  return page.slice(start, page.indexOf('</section>', start));
}

describe('the sections the navigation names', () => {
  it('lands every navigation entry on the section it names', () => {
    const page = pageOf();
    const entries: [string, string][] = [
      ['spec', 'Spec'],
      ['design', 'Design'],
      ['decision', 'Decision'],
      ['criteria', 'Criteria'],
      ['wireframe', 'Wireframe'],
      ['change', 'Change'],
      ['diff', 'Diff'],
      ['findings', 'Findings'],
    ];

    for (const [id, label] of entries) {
      expect(page).toContain(`data-section="${id}">${label}</a>`);
      expect(page).toContain(`id="section-${id}"`);
    }
  });

  it('reads each written artifact inside its own section', () => {
    const page = pageOf();
    const bodies: [string, string][] = [
      ['spec', 'The spec'],
      ['design', 'The design'],
      ['decision', 'The record'],
      ['change', 'The brief'],
      ['findings', 'The findings'],
    ];

    for (const [id, title] of bodies) {
      expect(sectionMarkup(page, id)).toContain(title);
    }
  });
});

describe('the panels the prose fills', () => {
  it('heads each prose panel with the artifact it reads', () => {
    const page = pageOf();

    for (const label of ['Spec', 'Design', 'Decision', 'Brief', 'Findings']) {
      expect(page).toContain(`<span class="panel-label">${label}</span>`);
    }
  });

  it('tells the reader nobody wrote the findings yet', () => {
    const page = pageOf({ artifacts: { findings: undefined, features: [] } });

    expect(sectionMarkup(page, 'findings')).toContain('Not written at this stage.');
  });

  it('keeps the diagram panel honest while no diagram exists', () => {
    const page = pageOf();
    const start = page.indexOf('data-panel="diagram"');
    const panel = page.slice(start, page.indexOf('</details>', start));

    expect(panel).toContain('Not written at this stage.');
  });
});

describe('the criteria cards and the wireframe bleed', () => {
  it('tells the reader no criteria exist yet', () => {
    const page = pageOf({ artifacts: { features: [] } });

    expect(sectionMarkup(page, 'criteria')).toContain(
      '<p class="unwritten">Not written at this stage.</p>',
    );
  });

  it('lays the feature cards side by side', () => {
    expect(pageOf()).toContain('</article><article class="feature-card"');
  });

  it('frames the wireframe through its keyed address', () => {
    expect(pageOf()).toContain(
      `<iframe class="wireframe" src="/wireframe?key=${KEY}" title="Wireframe"></iframe>`,
    );
  });
});

describe('the emptiness the navigation admits', () => {
  it('empties the spec entry when the spec is only whitespace', () => {
    const page = pageOf({ artifacts: { spec: ' \n\t', features: [] } });

    expect(page).toMatch(/class="nav-item is-empty"[^>]*data-section="spec"/);
  });

  it('fills the criteria entry only when features exist', () => {
    expect(pageOf()).not.toMatch(/class="nav-item is-empty"[^>]*data-section="criteria"/);
    expect(pageOf({ artifacts: { features: [] } })).toMatch(
      /class="nav-item is-empty"[^>]*data-section="criteria"/,
    );
  });

  it('keeps the wireframe entry filled with nothing written', () => {
    expect(pageOf({ artifacts: { features: [] } })).not.toMatch(
      /class="nav-item is-empty"[^>]*data-section="wireframe"/,
    );
  });

  it('dims a diff of pure whitespace', () => {
    const page = pageOf({ artifacts: { features: [], diff: '\n  \n' } });

    expect(page).toMatch(/class="nav-item is-empty"[^>]*data-section="diff"/);
    expect(sectionMarkup(page, 'diff')).toContain('No change to show at this stage.');
  });

  it('fills the diff entry once a change exists', () => {
    const page = pageOf({ artifacts: { features: [], diff: CHANGE } });

    expect(page).not.toMatch(/class="nav-item is-empty"[^>]*data-section="diff"/);
  });
});

describe('the matrix the decision declares', () => {
  const MATRIX_ADR =
    '# The record\n\n## Decision drivers\n\n- Reads well\n\n## Decision\n\nOption: Keep it\nVerdicts: ++\n\nProse stays.\n';

  it('folds the driver matrix beside the decision prose', () => {
    const page = pageOf({ artifacts: { adr: MATRIX_ADR, features: [] } });
    const section = sectionMarkup(page, 'decision');

    expect(section).toContain('<span class="panel-label">Drivers</span>');
    expect(section).toContain('matrix-corner');
  });

  it('keeps the matrix lines out of the decision prose', () => {
    const page = pageOf({ artifacts: { adr: MATRIX_ADR, features: [] } });
    const section = sectionMarkup(page, 'decision');

    expect(section).not.toContain('Verdicts:');
    expect(section).toContain('Prose stays.');
  });

  it('lays no drivers panel when the record declares no matrix', () => {
    expect(sectionMarkup(pageOf(), 'decision')).not.toContain('panel-label">Drivers');
  });

  it('tells the reader nobody wrote the decision yet', () => {
    const page = pageOf({ artifacts: { adr: undefined, features: [] } });

    expect(sectionMarkup(page, 'decision')).toContain(
      '<p class="unwritten">Not written at this stage.</p>',
    );
  });
});

describe('the audiences the prose sections offer', () => {
  it('wraps the spec, design, and decision prose in audience variants', () => {
    const page = pageOf();

    for (const group of ['spec', 'design', 'decision']) {
      expect(page).toContain(`<div class="audience-variants" data-audience-group="${group}">`);
      expect(page).toContain(`<span class="audience-switch" data-audience-group="${group}">`);
    }
  });

  it('reads a plain version into the plain variant', () => {
    const page = pageOf({
      artifacts: { specPlain: '# The plain spec\n\nWritten for everyone.', features: [] },
    });

    expect(sectionMarkup(page, 'spec')).toContain('Written for everyone.');
    expect(sectionMarkup(page, 'spec')).not.toContain('No plain version written.');
  });

  it('dims the plain option of a spec nobody translated', () => {
    const section = sectionMarkup(pageOf(), 'spec');

    expect(section).toContain('No plain version written.');
    expect(section).toContain('disabled aria-disabled="true"');
  });

  it('dims the plain option of a decision nobody translated', () => {
    expect(sectionMarkup(pageOf(), 'decision')).toContain(
      '<p class="unwritten">No plain version written.</p>',
    );
  });

  it('keeps the unwritten paragraph inside the technical variant', () => {
    const page = pageOf({ artifacts: { spec: undefined, features: [] } });

    expect(sectionMarkup(page, 'spec')).toContain(
      '<div class="audience-variant is-active" data-audience="technical"><p class="unwritten">Not written at this stage.</p></div>',
    );
  });

  it('keeps the matrix out of the audience wrap', () => {
    const page = pageOf({
      artifacts: {
        adr: '# R\n\n## Decision drivers\n\n- Reads\n\n## Decision\n\nOption: A\nVerdicts: ++\n',
        features: [],
      },
    });
    const section = sectionMarkup(page, 'decision');
    const wrapped = section.indexOf('</div></div>', section.indexOf('audience-variants'));

    expect(section.indexOf('matrix-corner')).toBeGreaterThan(wrapped);
  });
});

describe('the addresses the bootstrap carries', () => {
  it('routes every feature and names the first child of its section', () => {
    const page = pageOf();

    expect(page).toContain(
      '"criteria/landing-shell.feature":{"section":"criteria","feature":"landing-shell.feature"}',
    );
    expect(page).toContain('"firstChild":{"criteria":"criteria/brand-colors.feature"}');
  });

  it('wears nothing when the server hands it no styles', () => {
    expect(pageOf()).toContain('<style></style>');
  });
});
