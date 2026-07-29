import { describe, expect, it } from 'vitest';

import { resolveTarget } from './resolve-target.ts';

describe('resolving which preset governs a file', () => {
  it('finds the target the file sits under', () => {
    const targets = { 'packages/cli': 'cli' } as const;

    expect(resolveTarget('packages/cli/src/main.ts', targets)).toBe('cli');
  });

  it('reports nothing for a file no target covers', () => {
    const targets = { 'packages/cli': 'cli' } as const;

    expect(resolveTarget('scripts/release.ts', targets)).toBeUndefined();
  });

  it('prefers the deepest target when one sits inside another', () => {
    const targets = { packages: 'api', 'packages/tui': 'tui' } as const;

    expect(resolveTarget('packages/tui/src/app/index.ts', targets)).toBe('tui');
  });

  it('prefers the deepest target however the map was written', () => {
    const targets = { 'packages/tui': 'tui', packages: 'api' } as const;

    expect(resolveTarget('packages/tui/src/app/index.ts', targets)).toBe('tui');
  });

  it('reads a directory boundary, not a string prefix', () => {
    const targets = { 'packages/cli': 'cli' } as const;

    expect(resolveTarget('packages/cli-extra/src/main.ts', targets)).toBeUndefined();
  });

  it('governs the target directory itself, not only what is under it', () => {
    const targets = { 'packages/cli': 'cli' } as const;

    expect(resolveTarget('packages/cli', targets)).toBe('cli');
  });

  it('reports nothing when the repository declares no targets', () => {
    expect(resolveTarget('packages/cli/src/main.ts', {})).toBeUndefined();
  });
});
