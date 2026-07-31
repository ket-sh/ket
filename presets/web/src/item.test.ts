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
});
