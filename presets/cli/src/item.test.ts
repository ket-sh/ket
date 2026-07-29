import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';

const REPOSITORY_ROOT = join(import.meta.dirname, '..', '..', '..');

function isVersionMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((version) => typeof version === 'string')
  );
}

function devDependenciesOf(manifest: unknown): unknown {
  return typeof manifest === 'object' && manifest !== null && 'devDependencies' in manifest
    ? manifest.devDependencies
    : undefined;
}

async function versionsKetPins(): Promise<Record<string, string>> {
  const manifest: unknown = JSON.parse(
    await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
  );
  const declared = devDependenciesOf(manifest);

  if (!isVersionMap(declared)) {
    throw new Error('the repository manifest declares no devDependencies');
  }

  return declared;
}

function splitPin(pin: string): { name: string; version: string } {
  const at = pin.lastIndexOf('@');

  return { name: pin.slice(0, at), version: pin.slice(at + 1) };
}

describe('the cli preset item', () => {
  it('pins every package it ships, since a range moves a gate without a commit', () => {
    for (const pin of CLI_PRESET.devDependencies) {
      expect(splitPin(pin).version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('ships the same versions ket runs, so a user gets the gate ket tested', async () => {
    const pinned = await versionsKetPins();

    for (const pin of CLI_PRESET.devDependencies) {
      const { name, version } = splitPin(pin);
      const ours = pinned[name];

      if (ours !== undefined) {
        expect(`${name}@${version}`).toBe(`${name}@${ours}`);
      }
    }
  });

  it('declares the whole gate chain, not a sample of it', () => {
    const names = CLI_PRESET.devDependencies.map((pin) => splitPin(pin).name);

    for (const gate of ['oxlint', 'oxfmt', 'vitest', 'lefthook', 'knip', 'jscpd', 'cspell']) {
      expect(names).toContain(gate);
    }
  });

  it('writes the configs that make the gate chain real', () => {
    const targets = CLI_PRESET.files.map((file) => file.target);

    for (const config of ['~/.oxlintrc.json', '~/stryker.conf.json', '~/lefthook.yml']) {
      expect(targets).toContain(config);
    }
  });

  it('targets every file it writes at a path inside the repository it configures', () => {
    expect(CLI_PRESET.files.length).toBeGreaterThan(0);

    for (const file of CLI_PRESET.files) {
      expect(file.target.startsWith('~/')).toBe(true);
    }
  });

  it('carries every file it promises, since a missing one fails at init and not here', async () => {
    for (const file of CLI_PRESET.files) {
      await expect(access(join(import.meta.dirname, '..', file.path))).resolves.toBeUndefined();
    }
  });

  it('names the preset ket resolves it by', () => {
    expect(CLI_PRESET.name).toBe('ket-cli');
  });
});
