import { describe, expect, it } from 'vitest';

import { renderConfiguration } from './configuration.ts';

describe('rendering the configuration a repository owns', () => {
  it('carries the project key', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: {},
      integrations: [],
      workflow: true,
    });

    expect(rendered).toContain("key: 'OFS'");
  });

  it('maps every directory to the preset that governs it', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
      integrations: [],
      workflow: true,
    });

    expect(rendered).toContain("'packages/cli': 'cli'");
    expect(rendered).toContain("'packages/tui': 'tui'");
  });

  it('gives every target its own line, since a person edits this file', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
      integrations: [],
      workflow: true,
    });
    const lines = rendered.split('\n').filter((line) => line.includes('packages/'));

    expect(lines).toHaveLength(2);
  });

  it('writes an empty map rather than omitting it, so the shape never surprises', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: {},
      integrations: [],
      workflow: true,
    });

    expect(rendered).toContain('targets: {}');
  });

  it('renders a module the repository can typecheck on its own', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { app: 'cli' },
      integrations: [],
      workflow: true,
    });

    expect(rendered.startsWith('export default {')).toBe(true);
    expect(rendered.endsWith('};\n')).toBe(true);
  });
});

describe('recording whether a project drives the ket pipeline', () => {
  it('records the pipeline a project asked for, so the harness knows which commands it has', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: [],
        workflow: true,
      }),
    ).toContain('workflow: true,');
  });

  it('records a project that took the gates alone, rather than leaving the field out', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: [],
        workflow: false,
      }),
    ).toContain('workflow: false,');
  });
});

describe('recording which integrations a project enabled', () => {
  it('writes the chosen integrations, so the pipeline can read what is available', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: ['codecov'],
        workflow: true,
      }),
    ).toContain("integrations: ['codecov'],");
  });

  it('writes an empty list when a project enabled none', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: [],
        workflow: true,
      }),
    ).toContain('integrations: [],');
  });

  it('keeps every chosen integration in the order it was offered', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: ['codecov', 'codeql', 'coderabbit'],
        workflow: true,
      }),
    ).toContain("integrations: ['codecov', 'codeql', 'coderabbit'],");
  });
});
