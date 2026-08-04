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

  it('marks the current stage once and every earlier stage as done', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page.match(/is-current/g)).toHaveLength(1);
    expect(page.match(/is-done/g)).toHaveLength(4);
  });

  it('opens on the change section while the item verifies', () => {
    expect(assemblePage(surfaceOf(), { sessionKey: KEY })).toContain(
      'data-default-section="change"',
    );
  });

  it('opens on the design section while the item awaits approval', () => {
    expect(assemblePage(surfaceOf({ status: 'awaiting-approval' }), { sessionKey: KEY })).toContain(
      'data-default-section="design"',
    );
  });
});

describe('the navigation the artifacts decide', () => {
  it('dims the entry of an artifact nobody has written', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toMatch(/data-section="findings"[^>]*class="[^"]*is-dimmed/);
  });

  it('keeps the entry of a written artifact undimmed', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).not.toMatch(/data-section="design"[^>]*class="[^"]*is-dimmed/);
  });

  it('lists one criteria child per feature file', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain('brand-colors.feature');
    expect(page).toContain('landing-shell.feature');
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
});

describe('the session key the page carries', () => {
  it('keys every address the page emits', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    for (const found of page.matchAll(new RegExp(KEY, 'g'))) {
      expect(page.slice(Math.max(0, found.index - 4), found.index)).toBe('key=');
    }
  });

  it('reaches the live channel and the wireframe through keyed addresses', () => {
    const page = assemblePage(surfaceOf(), { sessionKey: KEY });

    expect(page).toContain(`/ws?key=${KEY}`);
    expect(page).toContain(`/wireframe?key=${KEY}`);
  });
});
