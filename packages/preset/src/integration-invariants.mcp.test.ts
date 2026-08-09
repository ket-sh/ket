import { describe, expect, it } from 'vitest';

import type { PresetIntegration, PresetItem, PresetMcpServer } from './item.ts';

import { integrationInvariantsOf } from './integration-invariants.ts';

function itemOffering(integrations: PresetIntegration[]): PresetItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files: [],
    integrations,
  };
}

function invariantsBrokenBy(mcp: PresetMcpServer[]): string[] {
  return integrationInvariantsOf(
    itemOffering([
      {
        name: 'mobbin',
        category: 'design reference',
        asks: 'mobbin costs the same for a public repo and a private one.',
        reaches: { stage: 'designing', reference: 'https://mobbin.com' },
        mcp,
      },
    ]),
  );
}

describe('what an integration that registers an MCP server has to name', () => {
  it('breaks nothing when the server carries a name and a url', () => {
    expect(
      invariantsBrokenBy([{ name: 'mobbin', url: 'https://api.mobbin.com/mcp' }]),
    ).toStrictEqual([]);
  });

  it('names a server that goes by no name', () => {
    expect(invariantsBrokenBy([{ name: '  ', url: 'https://api.mobbin.com/mcp' }])).toStrictEqual([
      'the integration mobbin registers an MCP server that goes by no name',
    ]);
  });

  it('names a server with no url to reach it at', () => {
    expect(invariantsBrokenBy([{ name: 'mobbin', url: '  ' }])).toStrictEqual([
      'the integration mobbin registers the MCP server mobbin with no url to reach it at',
    ]);
  });
});
