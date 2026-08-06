import { describe, expect, it } from 'vitest';

import type { ItemSurface } from './page.ts';

import { assemblePage } from './page.ts';

const KEY = 'the-test-session-key-000000000';

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
      features: [],
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
});

describe('the audiences the untranslated panels admit', () => {
  it('dims the plain option of a decision nobody translated', () => {
    expect(sectionMarkup(pageOf(), 'decision')).toContain(
      '<p class="unwritten">No plain version written.</p>',
    );
  });

  it('dims the plain option of a design nobody translated', () => {
    expect(sectionMarkup(pageOf(), 'design')).toContain(
      '<p class="unwritten">No plain version written.</p>',
    );
  });

  it('keeps the unwritten paragraph inside an unwritten design', () => {
    const page = pageOf({ artifacts: { design: undefined, features: [] } });

    expect(sectionMarkup(page, 'design')).toContain(
      '<div class="audience-variant is-active" data-audience="technical"><p class="unwritten">Not written at this stage.</p></div>',
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

describe('the callouts the design lights', () => {
  const HOOKED = {
    light:
      '<svg class="d2-7 d2-svg"><svg><g class="Y2xp"><rect x="10" y="20"></rect></g></svg></svg>',
    dark: '<svg class="d2-7 d2-svg"><svg><g class="Y2xp"><rect x="10" y="20"></rect></g></svg></svg>',
  };

  it('folds the hooked diagram and marks the claim in the prose', () => {
    const page = pageOf({
      artifacts: {
        design: '# D\n\nthe cli assembles panels\n',
        callouts: JSON.stringify([{ claim: 'assembles panels', shape: 'cli' }]),
        diagram: HOOKED,
        features: [],
      },
    });
    const section = sectionMarkup(page, 'design');

    expect(section).toContain('callout-switch');
    expect(section).toContain('callout-marker');
    expect(section).toContain('<g class="Y2xp callout-shape" data-callout-shape="Y2xp">');
  });

  it('keeps the plain scheme-paired diagram when nobody declares callouts', () => {
    const page = pageOf({ artifacts: { diagram: HOOKED, features: [] } });
    const section = sectionMarkup(page, 'design');

    expect(section).toContain(
      '<div class="diagram"><div class="diagram-scheme" data-diagram-scheme="light">',
    );
    expect(section).not.toContain('callout-switch');
  });
});
