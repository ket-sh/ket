import { comes, filesOf, installsOf, skillsOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { contentOf } from './contents.ts';
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

describe('the design system the web preset writes by default', () => {
  it('names shadcn, so create knows a preset code has components to restyle', () => {
    expect(WEB_PRESET.designSystem).toBe('shadcn');
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
    expect(CHROMATIC === undefined ? [] : installsOf(CHROMATIC)).toStrictEqual([
      'chromatic@18.1.0',
      '@chromatic-com/playwright@0.14.11',
    ]);
  });

  it('replaces the harness every spec reaches through, not one spec', () => {
    const written = CHROMATIC === undefined ? [] : filesOf(CHROMATIC);

    expect(written.map((file) => file.target)).toStrictEqual([
      '~/.github/workflows/chromatic.yml',
      '~/e2e/helpers/harness.ts',
      '~/scripts/check-bdd-binding.mts',
    ]);
  });

  it('reads the test bddgen resolved, since a harness that fails to bind stays silent', () => {
    const checker = contentOf('files/source/chromatic/check-bdd-binding.mts');

    expect(checker).toContain('.features-gen');
    expect(checker).toContain('*.spec.js');
  });

  it('stops when bddgen wrote nothing, so an empty run never reads as a pass', () => {
    expect(contentOf('files/source/chromatic/check-bdd-binding.mts')).toContain(
      'no generated spec under .features-gen',
    );
  });

  it('brings the official skills beside the tool', () => {
    expect(CHROMATIC === undefined ? [] : skillsOf(CHROMATIC)).toStrictEqual([
      { name: 'chromatic-setup-ci', source: 'chromaui/chromatic-skills' },
      { name: 'chromatic-workflow-debug', source: 'chromaui/chromatic-skills' },
    ]);
  });

  it('merges the archiving test into the bdd test and binds the steps to it', () => {
    const harness = contentOf('files/source/chromatic/harness.ts');

    expect(harness).toContain('mergeTests(');
    expect(harness).toContain('export const test');
    expect(harness).toContain('createSteps(test)');
  });
});

describe('the spell gate a scaffold turns on itself', () => {
  it('keeps the machine state out of it, and the human documents in it', () => {
    const spell = contentOf('files/cspell.json');

    expect(spell).toContain('.ket/scaffold.yaml');
    expect(spell).toContain('.ket/events.jsonl');
    expect(spell).toContain('.ket/toolchain.yaml');
    expect(spell).not.toContain('".ket"');
  });
});

describe('the binding every generated spec resolves its test through', () => {
  it('binds the plain harness to the bdd test it re-exports', () => {
    const harness = contentOf('files/source/e2e/helpers/harness.ts');

    expect(harness).toContain("from 'playwright-bdd'");
    expect(harness).toContain('export { test }');
    expect(harness).toContain('createSteps(test)');
  });

  it('names the harness in the steps glob so bddgen resolves the custom test', () => {
    expect(contentOf('files/playwright.config.ts')).toContain("'e2e/helpers/harness.ts'");
  });

  it('ships the rule that fails a spec reaching around the harness', () => {
    const rule = contentOf('files/source/scripts/bdd-binding.mts');

    expect(rule).toContain("'playwright-bdd'");
    expect(rule).toContain('e2e/helpers/harness.ts');
  });

  it('answers that rule from one module, so swapping a harness never forks it', () => {
    expect(WEB_PRESET.files.map((file) => file.target)).toContain('~/scripts/bdd-binding.mts');
    expect(contentOf('files/source/scripts/check-bdd-binding.mts')).toContain(
      "from './bdd-binding.mts'",
    );
    expect(contentOf('files/source/chromatic/check-bdd-binding.mts')).toContain(
      "from './bdd-binding.mts'",
    );
  });
});

describe('what the web preset offers a project that wants a supply-chain risk score', () => {
  const SCORECARD = WEB_PRESET.integrations.find((offered) => offered.name === 'scorecard');
  const SENTENCE = SCORECARD === undefined || comes(SCORECARD) ? '' : SCORECARD.asks;

  it('offers it beside the other services that answer for a repository', () => {
    expect(SCORECARD).toBeDefined();
  });

  it('ships the workflow scorecard reads its schedule and its permissions from', () => {
    const written = SCORECARD === undefined ? [] : filesOf(SCORECARD);

    expect(written.map((file) => file.target)).toStrictEqual(['~/.github/workflows/scorecard.yml']);
  });

  it('says what a public repository gets and what a private one still needs', () => {
    expect(SENTENCE.toLowerCase()).toContain('public');
    expect(SENTENCE.toLowerCase()).toContain('private');
  });
});
