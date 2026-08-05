import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ItemSurface } from './page.ts';

import { assemblePage } from './page.ts';

const KEY = 'the-test-session-key-000000000';

const artifactText = fc.string({ maxLength: 200 }).filter((text) => !text.includes(KEY));

const maybeArtifact = fc.option(artifactText, { nil: undefined });

const surfaces = fc
  .record({
    status: fc.constantFrom(
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
      'shipped',
    ),
    spec: maybeArtifact,
    design: maybeArtifact,
    adr: maybeArtifact,
    brief: maybeArtifact,
    findings: maybeArtifact,
  })
  .map(
    (drawn): ItemSurface => ({
      key: 'RL-2',
      title: 'Replace welcome scaffold with landing page shell',
      status: drawn.status,
      artifacts: {
        spec: drawn.spec,
        design: drawn.design,
        adr: drawn.adr,
        brief: drawn.brief,
        findings: drawn.findings,
        features: [],
      },
    }),
  );

function surfaceCarrying(name: string): ItemSurface {
  return {
    key: 'RL-2',
    title: 'Replace welcome scaffold with landing page shell',
    status: 'awaiting-approval',
    artifacts: {
      spec: '# The spec',
      design: undefined,
      adr: undefined,
      brief: undefined,
      findings: undefined,
      features: [{ name, source: 'Feature: Sample\n' }],
    },
  };
}

const smuggledNames = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((name) => !name.includes(KEY))
  .map((name) => `${name}.feature`);

function carriedPayload(page: string): string {
  const opener = 'window.ketSurface = ';
  const start = page.indexOf(opener) + opener.length;

  return page.slice(start, page.indexOf('<script type="module" src="/surface.js', start));
}

function navTargets(page: string): string[] {
  return [...page.matchAll(/data-section="([a-z-]+)"/g)].flatMap((found) =>
    found[1] === undefined ? [] : [found[1]],
  );
}

describe('the invariants every assembled page keeps', () => {
  it('never lets the session key appear outside a keyed address', () => {
    fc.assert(
      fc.property(surfaces, (surface) => {
        const page = assemblePage(surface, { sessionKey: KEY });

        for (const found of page.matchAll(new RegExp(KEY, 'g'))) {
          expect(page.slice(Math.max(0, found.index - 4), found.index)).toBe('key=');
        }
      }),
    );
  });

  it('keeps a script closer smuggled into a feature name inert', () => {
    const page = assemblePage(surfaceCarrying('evil</script><script>boom.feature'), {
      sessionKey: KEY,
    });

    expect(page).not.toContain('</script><script>boom');
  });

  it('carries any feature name without handing the script context a way out', () => {
    fc.assert(
      fc.property(smuggledNames, (name) => {
        const page = assemblePage(surfaceCarrying(name), { sessionKey: KEY });
        const carried = carriedPayload(page);

        expect(carried.match(/</g)).toHaveLength(1);
        expect(carried).toContain('.feature');
      }),
    );
  });

  it('gives every navigation entry exactly one section to land on', () => {
    fc.assert(
      fc.property(surfaces, (surface) => {
        const page = assemblePage(surface, { sessionKey: KEY });

        for (const target of navTargets(page)) {
          const marker = `id="section-${target}"`;

          expect(page.indexOf(marker)).toBe(page.lastIndexOf(marker));
          expect(page).toContain(marker);
        }
      }),
    );
  });
});
