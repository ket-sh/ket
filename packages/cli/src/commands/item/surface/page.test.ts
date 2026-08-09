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
      adr: '# The record\n\nStatus: accepted\n\nShort.',
      brief: '# The brief\n\nShort.',
      findings: undefined,
      features: [
        { name: 'brand-colors.feature', source: 'Feature: Brand colors\n' },
        { name: 'landing-shell.feature', source: 'Feature: Landing shell\n' },
      ],
      ...overrides.artifacts,
    },
    ...overrides,
  };
}

describe('the page an item assembles into', () => {
  it('names the item by its key and title in the header', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('RL-2');
    expect(page).toContain('Replace welcome scaffold with landing page shell');
  });

  it('walks the stepper through all seven stages in pipeline order', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });
    const positions = [
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
      'shipped',
    ].map((stage) => page.indexOf(`data-stage="${stage}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('marks the current stage once and ticks every earlier stage', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page.match(/class="stage is-current"/g)).toHaveLength(1);
    expect(page.match(/class="stage is-done"/g)).toHaveLength(4);
    expect(page.match(/stage-tick/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('opens on the change section while the item verifies', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('data-default-section="change"');
    expect(page).toMatch(/class="section is-masonry is-active" id="section-change"/);
  });

  it('opens on the design section while the item awaits approval', () => {
    expect(assemblePage(surfaceOf({ status: 'awaiting-approval' }), { sessionKey: KEY })).toContain(
      'data-default-section="design"',
    );
  });
});

describe('the navigation the artifacts decide', () => {
  it('groups the sections under Design and Verify', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('<p class="nav-group">Design</p>');
    expect(page).toContain('<p class="nav-group">Verify</p>');
  });

  it('empties the entry of an artifact nobody has written', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toMatch(/class="nav-item is-empty"[^>]*data-section="findings"/);
  });

  it('keeps the entry of a written artifact plain', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).not.toMatch(/class="nav-item is-empty"[^>]*data-section="design"/);
  });

  it('lists one criteria child route per feature file', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('data-route="criteria/brand-colors.feature"');
    expect(page).toContain('data-route="criteria/landing-shell.feature"');
  });

  it('keeps a quoted feature name inside the attribute it labels', () => {
    const page = assemblePage(
      surfaceOf({
        artifacts: {
          features: [{ name: 'evil" onclick="alert(1)', source: 'Feature: Evil\n' }],
        },
      }),
      { sessionKey: KEY },
    );

    expect(page).not.toContain('onclick="alert(1)"');
    expect(page).toContain('&quot;');
  });

  it('gives every navigation entry a section to land on', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });
    const targets = [...page.matchAll(/data-section="([a-z-]+)"/g)].map((found) => found[1]);

    for (const target of targets) {
      expect(page).toContain(`id="section-${String(target)}"`);
    }
  });

  it('offers the sidebar toggle as a real button wearing its glyph', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toMatch(/<button[^>]*class="nav-toggle"[^>]*aria-controls="page-nav"/);
    expect(page).toContain('nav-toggle-rail');
    expect(page).toContain('nav-toggle-frame');
    expect(page).toContain('nav-toggle-spine');
  });

  it('tells the reader when there is no change to diff yet', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('<p class="unwritten">No change to show at this stage.</p>');
  });
});

describe('the hostility the page keeps inert', () => {
  it('keeps a hostile status from ending the title early', () => {
    const page = assemblePage(surfaceOf({ status: '</title><script>boom' }), { sessionKey: KEY });

    expect(page).not.toContain('</title><script>boom');
  });

  it('keeps a script closer smuggled into a feature source inert', () => {
    const page = assemblePage(
      surfaceOf({
        artifacts: {
          features: [{ name: 'evil.feature', source: 'Feature: </script><script>boom\n' }],
        },
      }),
      { sessionKey: KEY },
    );

    expect(page).not.toContain('</script><script>boom');
  });
});

describe('the criteria the page lets you edit', () => {
  it('mounts an editor host and a save button per feature card', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page.match(/class="feature-card"/g)).toHaveLength(2);
    expect(page.match(/class="feature-editor"/g)).toHaveLength(2);
    expect(page.match(/class="feature-save"/g)).toHaveLength(2);
  });

  it('embeds each feature source as inert json for the editor', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page.match(/class="feature-source"/g)).toHaveLength(2);
    expect(page).toContain(JSON.stringify('Feature: Brand colors\n'));
  });

  it('loads the client script as a module so its names stay off the window', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toMatch(/<script type="module" src="\/surface\.js\?key=/);
  });
});

describe('the bricks the sections lay', () => {
  it('lays a masonry grid inside a prose section', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('class="grid-stack"');
    expect(page).toContain('class="panel-head"');
  });

  it('seats the diagram beside the design as a collapsible panel', () => {
    const page = assemblePage(
      surfaceOf({
        artifacts: {
          features: [],
          diagram: { light: '<svg data-light="1"></svg>', dark: '<svg data-dark="1"></svg>' },
        },
      }),
      { sessionKey: KEY },
    );

    expect(page).toContain('<svg data-light="1"></svg>');
    expect(page).toContain('<svg data-dark="1"></svg>');
    expect(page).toMatch(/<details[^>]*data-panel="diagram"[^>]*open>/);
  });
});

describe('the diff the page stages', () => {
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

  it('opens the changed files from the explorer tree', () => {
    const page = assemblePage(surfaceOf({ artifacts: { features: [], diff: CHANGE } }), {
      sessionKey: KEY,
    });

    expect(page).toContain('class="diff-tree"');
    expect(page).toContain('<article class="diff-file is-shown"');
    expect(page.match(/src\/app\.ts/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('empties the diff entry while the change is empty', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toMatch(/class="nav-item is-empty"[^>]*data-section="diff"/);
  });
});

describe('the skin the page wears', () => {
  it('wears the styles the server hands it', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY, styles: '.the-skin{color:red}' });

    expect(page).toContain('<style>.the-skin{color:red}</style>');
  });

  it('offers the tri-state theme switcher', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    for (const choice of ['system', 'dark', 'light']) {
      expect(page).toContain(`data-theme="${choice}"`);
    }
  });

  it('resolves the scheme before first paint', () => {
    expect(assemblePage(surfaceOf(), { sessionKey: KEY })).toContain('dataset.scheme');
  });
});

describe('the session key the page carries', () => {
  it('keys every address the page emits', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    for (const found of page.matchAll(new RegExp(KEY, 'g'))) {
      expect(page.slice(Math.max(0, found.index - 4), found.index)).toBe('key=');
    }
  });

  it('reaches the live channel and the bricks through keyed addresses', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain(`/ws?key=${KEY}`);
    expect(page).toContain(`/gridstack.js?key=${KEY}`);
  });
});
