import { describe, expect, it } from 'vitest';

import { renderConfiguration } from './configuration.ts';

describe('rendering the configuration a repository owns', () => {
  it('carries the project key', () => {
    const rendered = renderConfiguration({ key: 'OFS', targets: {} });

    expect(rendered).toContain("key: 'OFS'");
  });

  it('maps every directory to the preset that governs it', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
    });

    expect(rendered).toContain("'packages/cli': 'cli'");
    expect(rendered).toContain("'packages/tui': 'tui'");
  });

  it('gives every target its own line, since a person edits this file', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
    });
    const lines = rendered.split('\n').filter((line) => line.includes('packages/'));

    expect(lines).toHaveLength(2);
  });

  it('writes an empty map rather than omitting it, so the shape never surprises', () => {
    const rendered = renderConfiguration({ key: 'OFS', targets: {} });

    expect(rendered).toContain('targets: {}');
  });

  it('renders a module the repository can typecheck on its own', () => {
    const rendered = renderConfiguration({ key: 'OFS', targets: { app: 'cli' } });

    expect(rendered.startsWith('export default {')).toBe(true);
    expect(rendered.endsWith('};\n')).toBe(true);
  });
});
