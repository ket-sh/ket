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
