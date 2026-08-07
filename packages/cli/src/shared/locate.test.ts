import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  insideRepository,
  integrationsFrom,
  keyFrom,
  ketRootFrom,
  ketRootOrThrow,
  languageFrom,
  sourceRootsOf,
  targetsFrom,
  workflowFrom,
} from './locate.ts';

let root = '';

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-locate-'));

  await mkdir(join(root, '.ket', 'items'), { recursive: true });
  await mkdir(join(root, 'src', 'commands', 'hello'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.ts'), 'export default {};\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('finding the repository a gate is firing inside', () => {
  it('finds the root from the root itself', async () => {
    await expect(ketRootFrom(root)).resolves.toBe(root);
  });

  it('climbs out of a nested directory to reach it', async () => {
    await expect(ketRootFrom(join(root, 'src', 'commands', 'hello'))).resolves.toBe(root);
  });

  it('reports nothing when no ket directory sits above', async () => {
    await expect(ketRootFrom(tmpdir())).resolves.toBeUndefined();
  });
});

describe('the source roots a target map declares', () => {
  it('reads the source directory of a target at the repository root', () => {
    expect(sourceRootsOf({ '.': 'cli' })).toStrictEqual(['src']);
  });

  it('prefixes the source directory of a nested target', () => {
    expect(sourceRootsOf({ 'packages/cli': 'cli' })).toStrictEqual(['packages/cli/src']);
  });

  it('reads every target, since a repository may hold several', () => {
    expect(sourceRootsOf({ 'packages/cli': 'cli', 'packages/api': 'api' })).toStrictEqual([
      'packages/cli/src',
      'packages/api/src',
    ]);
  });

  it('declares nothing when the map is empty', () => {
    expect(sourceRootsOf({})).toStrictEqual([]);
  });
});

describe('reading the target map out of a config module', () => {
  it('reads the map a project config exports', () => {
    expect(targetsFrom({ default: { targets: { '.': 'cli' } } })).toStrictEqual({ '.': 'cli' });
  });

  it('reads nothing from a module with no default export', () => {
    expect(targetsFrom({})).toStrictEqual({});
  });

  it('reads nothing when the default export names no targets', () => {
    expect(targetsFrom({ default: { key: 'AUTH' } })).toStrictEqual({});
  });

  it('reads nothing when the targets are not a map', () => {
    expect(targetsFrom({ default: { targets: 'everything' } })).toStrictEqual({});
  });

  it('reads nothing from a module that is not an object', () => {
    expect(targetsFrom(undefined)).toStrictEqual({});
  });

  it('keeps only the entries naming a preset ket knows', () => {
    expect(targetsFrom({ default: { targets: { '.': 'cli', old: 'php' } } })).toStrictEqual({
      '.': 'cli',
    });
  });
});

describe('a config module that is not there', () => {
  it('reads nothing from nothing', () => {
    expect(targetsFrom(null)).toStrictEqual({});
  });

  it('reads nothing when the default export is null', () => {
    expect(targetsFrom({ default: null })).toStrictEqual({});
  });

  it('reads nothing when the targets are null', () => {
    expect(targetsFrom({ default: { targets: null } })).toStrictEqual({});
  });
});

describe('reading the project key out of a config module', () => {
  it('reads the key a project config exports', () => {
    expect(keyFrom({ default: { key: 'AUTH' } })).toBe('AUTH');
  });

  it('reads nothing when the config names no key', () => {
    expect(keyFrom({ default: { targets: {} } })).toBeUndefined();
  });

  it('reads nothing when the key is empty, since an item needs a prefix', () => {
    expect(keyFrom({ default: { key: '' } })).toBeUndefined();
  });

  it('reads nothing when the key is not a string', () => {
    expect(keyFrom({ default: { key: 7 } })).toBeUndefined();
  });

  it('reads nothing from a module that is not there', () => {
    expect(keyFrom(null)).toBeUndefined();
  });
});

describe('reading the integrations out of a config module', () => {
  it('reads the names a project config exports', () => {
    expect(integrationsFrom({ default: { integrations: ['codecov', 'codeql'] } })).toStrictEqual([
      'codecov',
      'codeql',
    ]);
  });

  it('reads none when the config names none, or names them in a shape it cannot read', () => {
    expect(integrationsFrom({ default: {} })).toStrictEqual([]);
    expect(integrationsFrom({ default: { integrations: 'codecov' } })).toStrictEqual([]);
    expect(integrationsFrom({ default: { integrations: [7, 'codecov'] } })).toStrictEqual([
      'codecov',
    ]);
  });
});

describe('reading the documentation language out of a config module', () => {
  it('reads the tag a project config exports', () => {
    expect(languageFrom({ default: { language: 'tr' } })).toBe('tr');
  });

  it('reads a missing or unreadable tag as English, the way create defaults it', () => {
    expect(languageFrom({ default: {} })).toBe('en');
    expect(languageFrom({ default: { language: 7 } })).toBe('en');
    expect(languageFrom(null)).toBe('en');
  });
});

describe('reading the workflow choice out of a config module', () => {
  it('reads the choice a project config exports', () => {
    expect(workflowFrom({ default: { workflow: false } })).toBe(false);
  });

  it('reads a missing or unreadable choice as workflow on, the way create defaults it', () => {
    expect(workflowFrom({ default: {} })).toBe(true);
    expect(workflowFrom({ default: { workflow: 'yes' } })).toBe(true);
    expect(workflowFrom(null)).toBe(true);
  });
});

describe('reading a written path the way a hook sends it', () => {
  it('makes an absolute path relative to the repository, since that is what the rules read', () => {
    expect(insideRepository('/work/shop', '/work/shop/src/auth.ts')).toBe('src/auth.ts');
  });

  it('leaves a path already relative alone', () => {
    expect(insideRepository('/work/shop', 'src/auth.ts')).toBe('src/auth.ts');
  });

  it('reads the repository root itself as nothing under it', () => {
    expect(insideRepository('/work/shop', '/work/shop')).toBe('');
  });

  it('reports nothing for a path outside the repository', () => {
    expect(insideRepository('/work/shop', '/work/elsewhere/a.ts')).toBeUndefined();
  });

  it('reports nothing for a sibling whose name starts the same way', () => {
    expect(insideRepository('/work/shop', '/work/shop-legacy/a.ts')).toBeUndefined();
  });

  it('keeps a nested path whole', () => {
    expect(insideRepository('/work/shop', '/work/shop/src/commands/hello/command.ts')).toBe(
      'src/commands/hello/command.ts',
    );
  });
});

describe('demanding the repository rather than answering without one', () => {
  it('hands back the repository it found', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-root-'));

    await mkdir(join(root, '.ket'), { recursive: true });

    expect(await ketRootOrThrow(root)).toBe(root);
  });

  it('refuses with the directory it looked above, so the message can be acted on', async () => {
    const nowhere = await mkdtemp(join(tmpdir(), 'ket-none-'));

    await expect(ketRootOrThrow(nowhere)).rejects.toThrow(nowhere);
  });

  it('names the directory it was looking for', async () => {
    const nowhere = await mkdtemp(join(tmpdir(), 'ket-none-'));

    await expect(ketRootOrThrow(nowhere)).rejects.toThrow('.ket');
  });
});
