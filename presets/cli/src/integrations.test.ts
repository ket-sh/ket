import { categoriesOffering, filesOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';

const FILED = Object.fromEntries(
  categoriesOffering(CLI_PRESET.integrations).map((offered) => [
    offered.category,
    offered.offers.map((offer) => offer.name),
  ]),
);

describe('what the cli preset offers a project', () => {
  it('offers the tools a command line project can use, and no renderer tool', () => {
    expect(CLI_PRESET.integrations.map((integration) => integration.name)).toStrictEqual([
      'codecov',
      'qlty',
      'codeql',
      'coderabbit',
      'greptile',
    ]);
  });

  it('writes each integration where the tool that reads it looks', () => {
    const written = CLI_PRESET.integrations.flatMap((integration) => filesOf(integration));

    expect(written.map((file) => file.target)).toStrictEqual([
      '~/.github/workflows/coverage.yml',
      '~/.github/workflows/coverage.yml',
      '~/.github/workflows/codeql.yml',
      '~/.coderabbit.yaml',
      '~/.greptile/config.json',
      '~/.greptile/rules.md',
    ]);
  });

  it('files each tool it offers under the category that tool answers for', () => {
    expect(FILED).toStrictEqual({
      'AI pull-request review': ['coderabbit', 'greptile'],
      coverage: ['codecov', 'qlty'],
      'code scanning': ['codeql'],
    });
  });
});
