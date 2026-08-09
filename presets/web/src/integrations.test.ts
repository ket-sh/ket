import {
  categoriesOffering,
  comes,
  filesOf,
  installsOf,
  mcpServersOf,
  skillsOf,
} from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { WEB_PRESET } from './item.ts';

const FILED = Object.fromEntries(
  categoriesOffering(WEB_PRESET.integrations).map((offered) => [
    offered.category,
    offered.offers.map((offer) => offer.name),
  ]),
);

describe('what a frontend project is asked about, a category at a time', () => {
  it('files each tool it offers under the category that tool answers for', () => {
    expect(FILED).toStrictEqual({
      'design tool': ['pen', 'figma', 'paper'],
      'design reference': ['mobbin'],
      'visual review': ['chromatic'],
      'AI pull-request review': ['coderabbit', 'greptile'],
      coverage: ['codecov', 'qlty'],
      'supply chain': ['scorecard'],
      'code scanning': ['codeql'],
    });
  });
});

describe('what choosing pen brings', () => {
  const PEN = WEB_PRESET.integrations.find((integration) => integration.name === 'pen');

  it('lands the pen CLI as a pinned devDependency', () => {
    expect(PEN === undefined ? [] : installsOf(PEN)).toStrictEqual(['@pen.dev/cli@0.3.2']);
  });

  it('vendors the official pen skill, pinned to the CLI version that publishes it', () => {
    expect(PEN === undefined ? [] : skillsOf(PEN)).toStrictEqual([
      { name: 'pen-design', source: 'https://unpkg.com/@pen.dev/cli@0.3.2/SKILL.md' },
    ]);
  });

  it('scaffolds the home the git-versioned design files start from', () => {
    expect((PEN === undefined ? [] : filesOf(PEN)).map((file) => file.target)).toStrictEqual([
      '~/designs/.gitkeep',
    ]);
  });

  it('registers no MCP server, since the pen app registers its own when it runs', () => {
    expect(PEN === undefined ? [] : mcpServersOf(PEN)).toStrictEqual([]);
  });
});

describe('the design tools that only arrive soon', () => {
  it('announces figma and paper without letting either be chosen', () => {
    expect(WEB_PRESET.integrations.filter(comes).map((coming) => coming.name)).toStrictEqual([
      'figma',
      'paper',
    ]);
  });
});

describe('what choosing mobbin registers', () => {
  it('registers the hosted Mobbin MCP server the designing stage reaches through', () => {
    const mobbin = WEB_PRESET.integrations.find((integration) => integration.name === 'mobbin');

    expect(mobbin === undefined ? [] : mcpServersOf(mobbin)).toStrictEqual([
      { name: 'mobbin', url: 'https://api.mobbin.com/mcp' },
    ]);
  });
});
