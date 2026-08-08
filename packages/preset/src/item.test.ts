import { describe, expect, it } from 'vitest';

import type { PresetIntegration, PresetItem } from './item.ts';

import { copies, dependencyNamesOf, everyFileOf, skillsOf, writes } from './item.ts';

function itemThat(offering: Partial<PresetItem>): PresetItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files: [],
    integrations: [],
    ...offering,
  };
}

describe('a file a preset promises', () => {
  it('reads out of the preset directory and writes into the project directory', () => {
    expect(writes('oxlintrc.json', '.oxlintrc.json')).toStrictEqual({
      path: 'files/oxlintrc.json',
      type: 'registry:file',
      target: '~/.oxlintrc.json',
    });
  });

  it('keeps the directories it was given on both sides', () => {
    expect(writes('source/main.ts', 'src/main.ts')).toStrictEqual({
      path: 'files/source/main.ts',
      type: 'registry:file',
      target: '~/src/main.ts',
    });
  });
});

describe('a promise to copy bytes', () => {
  it('marks the file as base64 under files/ and the home marker', () => {
    expect(copies('source/hero/ket-bg.mp4', 'public/ket-bg.mp4')).toStrictEqual({
      path: 'files/source/hero/ket-bg.mp4',
      type: 'registry:file',
      target: '~/public/ket-bg.mp4',
      encoding: 'base64',
    });
  });

  it('writes text with no encoding mark at all', () => {
    expect(writes('vite.config.ts', 'vite.config.ts')).toStrictEqual({
      path: 'files/vite.config.ts',
      type: 'registry:file',
      target: '~/vite.config.ts',
    });
  });
});

describe('every file a preset can write', () => {
  it('gathers what an integration adds after what the preset always writes', () => {
    const item = itemThat({
      files: [writes('knip.json', 'knip.json')],
      integrations: [
        {
          name: 'codecov',
          category: 'coverage',
          asks: 'codecov?',
          files: [writes('coverage.yml', 'coverage.yml')],
        },
      ],
    });

    expect(everyFileOf(item).map((file) => file.path)).toStrictEqual([
      'files/knip.json',
      'files/coverage.yml',
    ]);
  });

  it('gathers the file of every integration, not only the first', () => {
    const item = itemThat({
      integrations: [
        {
          name: 'codecov',
          category: 'coverage',
          asks: 'codecov?',
          files: [writes('coverage.yml', 'coverage.yml')],
        },
        {
          name: 'codeql',
          category: 'code scanning',
          asks: 'codeql?',
          files: [writes('codeql.yml', 'codeql.yml')],
        },
      ],
    });

    expect(everyFileOf(item).map((file) => file.path)).toStrictEqual([
      'files/coverage.yml',
      'files/codeql.yml',
    ]);
  });

  it('gathers only what the preset always writes when it offers no integration', () => {
    const item = itemThat({ files: [writes('knip.json', 'knip.json')] });

    expect(everyFileOf(item).map((file) => file.path)).toStrictEqual(['files/knip.json']);
  });
});

describe('the skills an integration brings', () => {
  it('names the skills a chosen integration installs', () => {
    const integration: PresetIntegration = {
      name: 'chromatic',
      category: 'visual review',
      asks: 'reviews what a page looks like',
      skills: [{ name: 'chromatic-setup-ci', source: 'chromaui/skills' }],
      files: [],
    };

    expect(skillsOf(integration)).toStrictEqual([
      { name: 'chromatic-setup-ci', source: 'chromaui/skills' },
    ]);
  });

  it('brings no skills where the integration declares none', () => {
    const integration: PresetIntegration = {
      name: 'mobbin',
      category: 'design reference',
      asks: 'a gallery of shipped screens',
      reaches: { stage: 'designing', reference: 'https://mobbin.com' },
    };

    expect(skillsOf(integration)).toStrictEqual([]);
  });
});

describe('the packages a preset installs', () => {
  it('names a package without the version it pins to', () => {
    const item = itemThat({ dependencies: ['citty@0.2.2'] });

    expect(dependencyNamesOf(item)).toStrictEqual(['citty']);
  });

  it('keeps a scoped package whole, since the scope is half its name', () => {
    const item = itemThat({ devDependencies: ['@stryker-mutator/core@9.6.1'] });

    expect(dependencyNamesOf(item)).toStrictEqual(['@stryker-mutator/core']);
  });

  it('names what the project runs before what checks it', () => {
    const item = itemThat({ dependencies: ['citty@0.2.2'], devDependencies: ['oxlint@1.76.0'] });

    expect(dependencyNamesOf(item)).toStrictEqual(['citty', 'oxlint']);
  });

  it('names one package per pin, since a gap there proposes a checker twice', () => {
    const item = itemThat({
      dependencies: ['citty@0.2.2'],
      devDependencies: ['oxlint@1.76.0', 'knip@6.29.0'],
    });

    expect(dependencyNamesOf(item)).toHaveLength(3);
  });
});
