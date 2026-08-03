import { filesOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { WEB_PRESET } from './item.ts';

describe('the registry shape the web preset conforms to', () => {
  it('names the schema a registry consumer validates against', () => {
    expect(WEB_PRESET.$schema).toBe('https://ui.shadcn.com/schema/registry-item.json');
  });

  it('declares itself an item, since a consumer resolves by that type', () => {
    expect(WEB_PRESET.type).toBe('registry:item');
  });

  it('names the preset ket resolves it by', () => {
    expect(WEB_PRESET.name).toBe('ket-web');
  });
});

describe('what the web preset installs to render anything at all', () => {
  it('installs the router and the framework the routes are written against', () => {
    expect(WEB_PRESET.dependencies).toContain('@tanstack/react-router@1.170.18');
  });

  it('installs a renderer, since a route returns markup', () => {
    expect(WEB_PRESET.dependencies).toContain('react@19.2.8');
  });

  it('installs the primitive base the shared components render through', () => {
    expect(WEB_PRESET.dependencies).toContain('@base-ui/react@1.6.0');
  });
});

describe('what the web preset installs to check the shape of its own import graph', () => {
  it('installs the tool that finds a cycle, an orphan and an import steiger never follows', () => {
    expect(WEB_PRESET.devDependencies).toContain('dependency-cruiser@18.1.1');
  });
});

describe('what the web preset ships so a generated file refuses the edit it never wants', () => {
  it('ships the hook script the scaffold runs before every edit and write', () => {
    expect(WEB_PRESET.files.map((file) => file.target)).toContain(
      '~/scripts/protect-generated.mts',
    );
  });
});

describe('what the web preset offers a project that wants its screens reviewed', () => {
  const CHROMATIC = WEB_PRESET.integrations.find((offered) => offered.name === 'chromatic');

  it('installs the runner Chromatic uploads its archives from', () => {
    expect(CHROMATIC?.installs).toStrictEqual([
      'chromatic@18.1.0',
      '@chromatic-com/playwright@0.14.11',
    ]);
  });

  it('replaces the harness every spec reaches through, not one spec', () => {
    const written = CHROMATIC === undefined ? [] : filesOf(CHROMATIC);

    expect(written.map((file) => file.target)).toStrictEqual([
      '~/.github/workflows/chromatic.yml',
      '~/e2e/helpers/harness.ts',
    ]);
  });
});

describe('what the web preset offers a project that wants a supply-chain risk score', () => {
  const SCORECARD = WEB_PRESET.integrations.find((offered) => offered.name === 'scorecard');

  it('offers it beside the other services that answer for a repository', () => {
    expect(SCORECARD).toBeDefined();
  });

  it('ships the workflow scorecard reads its schedule and its permissions from', () => {
    const written = SCORECARD === undefined ? [] : filesOf(SCORECARD);

    expect(written.map((file) => file.target)).toStrictEqual(['~/.github/workflows/scorecard.yml']);
  });

  it('says what a public repository gets and what a private one still needs', () => {
    expect(SCORECARD?.asks.toLowerCase()).toContain('public');
    expect(SCORECARD?.asks.toLowerCase()).toContain('private');
  });
});
