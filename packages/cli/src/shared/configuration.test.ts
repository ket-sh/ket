import { describe, expect, it } from 'vitest';

import { renderConfiguration } from './configuration.ts';

describe('rendering the configuration a repository owns', () => {
  it('carries the project key', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: {},
      integrations: [],
      language: 'en',
      workflow: true,
    });

    expect(rendered).toContain("key: 'OFS'");
  });

  it('maps every directory to the preset that governs it', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
      integrations: [],
      language: 'en',
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
      language: 'en',
      workflow: true,
    });
    const lines = rendered.split('\n').filter((line) => line.includes('packages/'));

    expect(lines).toHaveLength(2);
  });
});

describe('the shape of the rendered module', () => {
  it('writes an empty map rather than omitting it, so the shape never surprises', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: {},
      integrations: [],
      language: 'en',
      workflow: true,
    });

    expect(rendered).toContain('targets: {}');
  });

  it('renders a module the repository can typecheck on its own', () => {
    const rendered = renderConfiguration({
      key: 'OFS',
      targets: { app: 'cli' },
      integrations: [],
      language: 'en',
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
        language: 'en',
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
        language: 'en',
        workflow: false,
      }),
    ).toContain('workflow: false,');
  });
});

describe('recording which language the documentation speaks', () => {
  it('records the chosen language beside the workflow choice', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: [],
        language: 'tr',
        workflow: true,
      }),
    ).toContain("language: 'tr',");
  });

  it('records English explicitly, so the default reads the same as a choice', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: [],
        language: 'en',
        workflow: true,
      }),
    ).toContain("language: 'en',");
  });
});

describe('recording which integrations a project enabled', () => {
  it('writes the chosen integrations, so the pipeline can read what is available', () => {
    expect(
      renderConfiguration({
        key: 'SHOP',
        targets: { '.': 'cli' },
        integrations: ['codecov'],
        language: 'en',
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
        language: 'en',
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
        language: 'en',
        workflow: true,
      }),
    ).toContain("integrations: ['codecov', 'codeql', 'coderabbit'],");
  });
});
