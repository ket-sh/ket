import type { PresetIntegration } from '@ket/preset';

import { copies, writes } from '@ket/preset';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import type { PresetName } from '../configuration.ts';

import {
  chosenFrom,
  filesFor,
  installsFor,
  integrationFile,
  integrationsOffered,
  mcpServersFor,
  offeredIntegrations,
  skillsFor,
} from './integrations.ts';

const CLI_OFFERS = 'codecov, qlty, codeql, coderabbit, greptile';

function offeredNames(presets: PresetName[]): string[] {
  return offeredIntegrations(presets).map((offered) => offered.name);
}

describe('what a preset offers', () => {
  it('offers the tools that suit a command line project', () => {
    expect(integrationsOffered('cli').map((offered) => offered.name)).toStrictEqual([
      'codecov',
      'qlty',
      'codeql',
      'coderabbit',
      'greptile',
    ]);
  });

  it('offers the tools that suit a frontend project', () => {
    expect(integrationsOffered('web').map((offered) => offered.name)).toStrictEqual([
      'pen',
      'figma',
      'paper',
      'mobbin',
      'chromatic',
      'scorecard',
      'codecov',
      'qlty',
      'codeql',
      'coderabbit',
      'greptile',
    ]);
  });

  it('offers nothing for a preset ket does not ship yet', () => {
    expect(integrationsOffered('mobile')).toStrictEqual([]);
  });

  it('offers one visual service, since the slot that reviews a page takes one', () => {
    const visual = integrationsOffered('web').filter(
      (offered) => offered.category === 'visual review',
    );

    expect(visual.map((offered) => offered.name)).toStrictEqual(['chromatic']);
  });
});

describe('gathering what every chosen preset offers', () => {
  it('offers each tool once when two targets share the preset that offers it', () => {
    expect(offeredNames(['cli', 'cli'])).toStrictEqual([
      'codecov',
      'qlty',
      'codeql',
      'coderabbit',
      'greptile',
    ]);
  });
});

describe('the files a chosen integration installs', () => {
  it('installs the workflow the chosen integration brings', () => {
    expect(filesFor(['cli'], ['codeql']).map((file) => file.path)).toStrictEqual([
      '.github/workflows/codeql.yml',
    ]);
  });

  it('installs nothing when a project chose nothing', () => {
    expect(filesFor(['cli'], [])).toStrictEqual([]);
  });

  it('installs nothing for a name no preset offers', () => {
    expect(filesFor(['cli'], ['chromatic'])).toStrictEqual([]);
  });

  it('installs every chosen integration, not only the first', () => {
    expect(filesFor(['cli'], ['codecov', 'coderabbit']).map((file) => file.path)).toStrictEqual([
      '.github/workflows/coverage.yml',
      '.coderabbit.yaml',
    ]);
  });

  it('installs a file once when two targets offer the same integration', () => {
    expect(filesFor(['cli', 'cli'], ['codeql'])).toHaveLength(1);
  });
});

describe('the skills a chosen integration brings', () => {
  it('brings the official skills of the chosen integration', () => {
    expect(skillsFor(['web'], ['chromatic'])).toStrictEqual([
      { name: 'chromatic-setup-ci', source: 'chromaui/chromatic-skills' },
      { name: 'chromatic-workflow-debug', source: 'chromaui/chromatic-skills' },
    ]);
  });

  it('brings nothing when a project chose nothing', () => {
    expect(skillsFor(['web'], [])).toStrictEqual([]);
  });

  it('brings a skill once when two targets offer the same integration', () => {
    expect(skillsFor(['web', 'web'], ['chromatic'])).toHaveLength(2);
  });
});

describe('turning an integration file into what a project receives', () => {
  it('marks a binary integration file as base64 and keeps its bytes whole', () => {
    const carried = Buffer.from('workflow badge bytes').toString('base64');

    expect(integrationFile(copies('badge.png', '.github/badge.png'), carried)).toStrictEqual({
      path: '.github/badge.png',
      contents: carried,
      encoding: 'base64',
    });
  });

  it('carries a text integration file without marking an encoding', () => {
    const file = writes('codeql.yml', '.github/workflows/codeql.yml');

    expect(integrationFile(file, 'name: CodeQL')).toStrictEqual({
      path: '.github/workflows/codeql.yml',
      contents: 'name: CodeQL',
    });
  });
});

describe('reading the integrations named on the command line', () => {
  it('reads a single name', () => {
    expect(chosenFrom('codecov', offeredIntegrations(['cli']))).toStrictEqual({
      chosen: ['codecov'],
    });
  });

  it('reads several names separated by commas', () => {
    expect(chosenFrom('codecov,coderabbit', offeredIntegrations(['cli']))).toStrictEqual({
      chosen: ['codecov', 'coderabbit'],
    });
  });

  it('reads nothing when the flag is absent', () => {
    expect(chosenFrom(undefined, offeredIntegrations(['cli']))).toStrictEqual({ chosen: [] });
  });

  it('ignores the space a person leaves after a comma', () => {
    expect(chosenFrom('codecov, codeql', offeredIntegrations(['cli']))).toStrictEqual({
      chosen: ['codecov', 'codeql'],
    });
  });

  it('refuses a name no chosen preset offers, and says what it does offer', () => {
    expect(chosenFrom('chromatic', offeredIntegrations(['cli']))).toStrictEqual({
      refused: `chromatic is not an integration this project offers. It offers ${CLI_OFFERS}`,
    });
  });

  it('refuses an empty name rather than reading it as nothing', () => {
    expect(chosenFrom('codecov,', offeredIntegrations(['cli']))).toStrictEqual({
      refused: ` is not an integration this project offers. It offers ${CLI_OFFERS}`,
    });
  });
});

describe('naming a tool that only arrives soon', () => {
  const DESIGN_TOOLS: PresetIntegration[] = [
    {
      name: 'pen',
      category: 'design tool',
      asks: 'pen, free on a public repository and a private one.',
      files: [writes('designs/gitkeep', 'designs/.gitkeep')],
    },
    { name: 'figma', category: 'design tool', soon: true },
  ];

  it('refuses the name and says it arrives soon', () => {
    expect(chosenFrom('figma', DESIGN_TOOLS)).toStrictEqual({
      refused: 'figma arrives soon and cannot be chosen yet',
    });
  });

  it('still lets the tool that works be chosen beside it', () => {
    expect(chosenFrom('pen', DESIGN_TOOLS)).toStrictEqual({ chosen: ['pen'] });
  });

  it('leaves a coming tool out of what it says the project offers', () => {
    expect(chosenFrom('argos', DESIGN_TOOLS)).toStrictEqual({
      refused: 'argos is not an integration this project offers. It offers pen',
    });
  });
});

describe('naming two tools for a slot that takes one', () => {
  it('refuses both coverage services, since each comments the same lcov', () => {
    expect(chosenFrom('codecov,qlty', offeredIntegrations(['cli']))).toStrictEqual({
      refused: 'codecov and qlty each answer for coverage, and a project takes one of them',
    });
  });

  it('reads two reviewers, since each posts a review of its own', () => {
    expect(chosenFrom('coderabbit,greptile', offeredIntegrations(['cli']))).toStrictEqual({
      chosen: ['coderabbit', 'greptile'],
    });
  });

  it('reads one tool for each slot that takes one', () => {
    expect(chosenFrom('qlty,codeql', offeredIntegrations(['cli']))).toStrictEqual({
      chosen: ['qlty', 'codeql'],
    });
  });
});

describe('the MCP servers a chosen integration registers', () => {
  it('registers the server the chosen integration brings', () => {
    expect(mcpServersFor(['web'], ['mobbin'])).toStrictEqual([
      { name: 'mobbin', url: 'https://api.mobbin.com/mcp' },
    ]);
  });

  it('registers nothing when a project chose nothing', () => {
    expect(mcpServersFor(['web'], [])).toStrictEqual([]);
  });

  it('registers nothing for an integration that brings only files', () => {
    expect(mcpServersFor(['web'], ['codecov'])).toStrictEqual([]);
  });

  it('registers a server once when two targets share the preset that offers it', () => {
    expect(mcpServersFor(['web', 'web'], ['mobbin'])).toHaveLength(1);
  });
});

describe('the packages a chosen integration installs', () => {
  it('installs nothing when a project chose nothing', () => {
    expect(installsFor(['web'], [])).toStrictEqual([]);
  });

  it('installs nothing for an integration that brings only files', () => {
    expect(installsFor(['web'], ['codecov'])).toStrictEqual([]);
  });

  it('installs what the chosen integration needs to work at all', () => {
    expect(installsFor(['web'], ['chromatic'])).toStrictEqual([
      'chromatic@18.1.0',
      '@chromatic-com/playwright@0.14.11',
    ]);
  });

  it('installs a package once when two targets share the preset that offers it', () => {
    expect(installsFor(['web', 'web'], ['chromatic'])).toHaveLength(2);
  });
});
