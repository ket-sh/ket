import type { OfferedCategory } from '@ket/preset';

import { categoriesOffering, filesOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';

function asked(offered: OfferedCategory): [string, string, string[]] {
  return [offered.category, offered.admits, offered.offers.map((offer) => offer.name)];
}

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

  it('asks about a coverage tool and a reviewer once each, whichever answers for the slot', () => {
    expect(categoriesOffering(CLI_PRESET.integrations).map(asked)).toStrictEqual([
      ['AI pull-request review', 'several', ['coderabbit', 'greptile']],
      ['coverage', 'one', ['codecov', 'qlty']],
      ['code scanning', 'one', ['codeql']],
    ]);
  });
});
