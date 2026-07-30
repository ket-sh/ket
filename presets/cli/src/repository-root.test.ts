import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { repositoryRootFrom } from './repository-root.ts';

let root = '';
let deep = '';

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-root-'));
  deep = join(root, 'presets', 'cli', 'src');

  await mkdir(deep, { recursive: true });
  await writeFile(join(root, 'turbo.json'), '{}\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('finding the repository a package sits in', () => {
  it('climbs to the directory that holds the workspace manifest', () => {
    expect(repositoryRootFrom(deep)).toBe(root);
  });

  it('stops at that directory rather than climbing past it', () => {
    expect(repositoryRootFrom(join(root, 'presets'))).toBe(root);
  });

  it('answers the root itself when asked from the root', () => {
    expect(repositoryRootFrom(root)).toBe(root);
  });

  it('refuses to guess when nothing above holds the manifest', () => {
    expect(() => repositoryRootFrom(tmpdir())).toThrow('so the repository root is unknown');
  });
});
