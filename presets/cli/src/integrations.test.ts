import { filesOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';

describe('what the cli preset offers a project', () => {
  it('offers the tools a command line project can use, and no renderer tool', () => {
    expect(CLI_PRESET.integrations.map((integration) => integration.name)).toStrictEqual([
      'codecov',
      'codeql',
      'coderabbit',
    ]);
  });

  it('writes each integration where the tool that reads it looks', () => {
    const written = CLI_PRESET.integrations.flatMap((integration) => filesOf(integration));

    expect(written.map((file) => file.target)).toStrictEqual([
      '~/.github/workflows/coverage.yml',
      '~/.github/workflows/codeql.yml',
      '~/.coderabbit.yaml',
    ]);
  });
});
