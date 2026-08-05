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

function designRegion(page: string): string {
  return page.slice(
    page.indexOf('<p class="nav-group">Design</p>'),
    page.indexOf('<p class="nav-group">Verify</p>'),
  );
}

function verifyRegion(page: string): string {
  return page.slice(page.indexOf('<p class="nav-group">Verify</p>'), page.indexOf('</nav>'));
}

describe('the stages the stepper grades', () => {
  it('sends each stage of the pipeline to its default section', () => {
    const map: [string, string][] = [
      ['triaged', 'design'],
      ['designing', 'design'],
      ['awaiting-approval', 'design'],
      ['implementing', 'change'],
      ['verifying', 'change'],
      ['awaiting-merge', 'change'],
      ['shipped', 'change'],
    ];

    for (const [stage, section] of map) {
      expect(pageOf({ status: stage })).toContain(`data-default-section="${section}"`);
    }
  });

  it('falls back to the design section for a stage it never met', () => {
    expect(pageOf({ status: 'unfiled' })).toContain('data-default-section="design"');
  });

  it('holds every later stage ahead and without a tick at the start', () => {
    const page = pageOf({ status: 'triaged' });

    expect(page.match(/class="stage is-ahead"/g)).toHaveLength(6);
    expect(page).not.toContain('stage-tick');
    expect(page.match(/<span class="stage-dot"><\/span>/g)).toHaveLength(7);
  });

  it('chains the stages without a seam', () => {
    expect(pageOf()).toContain('</li><li class="stage');
  });
});

describe('the two groups the navigation keeps apart', () => {
  it('keeps design work out of the verify group and back', () => {
    const page = pageOf();
    const design = designRegion(page);
    const verify = verifyRegion(page);

    for (const id of ['spec', 'design', 'decision', 'criteria', 'wireframe']) {
      expect(design).toContain(`data-section="${id}"`);
      expect(verify).not.toContain(`data-section="${id}"`);
    }

    for (const id of ['change', 'diff', 'findings']) {
      expect(verify).toContain(`data-section="${id}"`);
      expect(design).not.toContain(`data-section="${id}"`);
    }
  });

  it('marks the open section in the rail and nothing else', () => {
    const page = pageOf();

    expect(page).toContain(
      '<a class="nav-item is-selected" href="#change" data-section="change">Change</a>',
    );
    expect(page.match(/nav-item is-selected/g)).toHaveLength(1);
  });

  it('leaves a written unselected entry unadorned', () => {
    expect(pageOf()).toContain('<a class="nav-item" href="#spec" data-section="spec">Spec</a>');
  });

  it('opens each group straight onto its first entry', () => {
    const page = pageOf();

    expect(page).toContain('<p class="nav-group">Design</p><a class="nav-item" href="#spec"');
    expect(page).toContain('data-section="spec">Spec</a><a class="nav-item" href="#design"');
  });
});

describe('the children the criteria spread', () => {
  it('hangs the feature routes under criteria alone', () => {
    const page = pageOf();

    expect(page.match(/nav-children/g)).toHaveLength(1);
    expect(page).toContain('data-section="criteria">Criteria</a><div class="nav-children">');
    expect(page).toContain('</div><a class="nav-item" href="#wireframe"');
  });

  it('chains the child routes without a seam', () => {
    expect(pageOf()).toContain('</a><a class="nav-child"');
  });

  it('selects no child while the page opens elsewhere', () => {
    const page = pageOf();

    expect(page).not.toContain('nav-child is-selected');
    expect(page).toContain('<a class="nav-child" href="#criteria/brand-colors.feature"');
  });
});

describe('the one section the page opens', () => {
  it('activates the default section alone', () => {
    expect(pageOf().match(/is-active/g)).toHaveLength(1);
  });

  it('leaves the rest closed and unadorned', () => {
    expect(pageOf()).toContain('<section class="section is-masonry" id="section-spec"');
  });

  it('chains the sections without a seam', () => {
    expect(pageOf()).toContain('</section><section class="section');
  });
});
