import { describe, expect, it } from 'vitest';

import { renderManifest } from './manifest.ts';

const PRESET = {
  dependencies: ['citty@0.2.2'],
  devDependencies: ['oxlint@1.76.0', 'vitest@4.1.10'],
  scripts: { test: 'vitest run', lint: 'oxlint .' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function namesUnder(rendered: string, field: string): string[] {
  const manifest: unknown = JSON.parse(rendered);
  const section = isRecord(manifest) ? manifest[field] : undefined;

  return isRecord(section) ? Object.keys(section) : [];
}

describe('rendering the manifest a project starts from', () => {
  it('names the package after the directory it was created in', () => {
    const manifest: unknown = JSON.parse(renderManifest('order-service', PRESET));

    expect(manifest).toMatchObject({ name: 'order-service' });
  });

  it('splits a pin into a name and a range the manifest understands', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({
      dependencies: { citty: '0.2.2' },
      devDependencies: { oxlint: '1.76.0', vitest: '4.1.10' },
    });
  });

  it('keeps a scoped package whole, since its name carries an at sign of its own', () => {
    const manifest: unknown = JSON.parse(
      renderManifest('app', { ...PRESET, devDependencies: ['@types/bun@1.3.14'] }),
    );

    expect(manifest).toMatchObject({ devDependencies: { '@types/bun': '1.3.14' } });
  });

  it('carries the scripts the preset declares', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ scripts: { test: 'vitest run', lint: 'oxlint .' } });
  });

  it('declares modules, since ket scaffolds nothing that is not one', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ type: 'module' });
  });

  it('declares the bun floor a project needs to watch its own board', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ engines: { bun: '>=1.3.14' } });
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(renderManifest('app', PRESET).endsWith('}\n')).toBe(true);
  });
});

describe('the order the manifest lists things in', () => {
  it('sorts dependencies by name, the order a formatter settles on', () => {
    const rendered = renderManifest('my-app', {
      dependencies: ['zod@4.0.0', 'citty@0.2.2'],
      devDependencies: ['vitest@4.1.10', '@types/bun@1.3.14', 'oxlint@1.76.0'],
      scripts: {},
    });

    expect(namesUnder(rendered, 'dependencies')).toStrictEqual(['citty', 'zod']);
    expect(namesUnder(rendered, 'devDependencies')).toStrictEqual([
      '@types/bun',
      'oxlint',
      'vitest',
    ]);
  });

  it('leaves the scripts in the order the preset declares them', () => {
    const rendered = renderManifest('my-app', {
      dependencies: [],
      devDependencies: [],
      scripts: { build: 'a', test: 'b', lint: 'c' },
    });

    expect(namesUnder(rendered, 'scripts')).toStrictEqual(['build', 'test', 'lint']);
  });
});
