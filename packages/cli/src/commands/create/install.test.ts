import { CLI_PRESET } from '@ket/preset-cli';
import { WEB_PRESET } from '@ket/preset-web';
import { describe, expect, it } from 'vitest';

import { registeredPresets } from '../../shared/registry.ts';
import { filesToInstall, pathInProject, shippedContents } from './install.ts';

const MY_APP = { name: 'my-app', key: 'SHOP' };

describe('placing a registry target inside a project', () => {
  it('drops the home marker the registry writes', () => {
    expect(pathInProject('~/lefthook.yml')).toBe('lefthook.yml');
  });

  it('keeps a nested target nested', () => {
    expect(pathInProject('~/.vale/styles/ket/NoEmDash.yml')).toBe('.vale/styles/ket/NoEmDash.yml');
  });

  it('reads the marker only at the start, never inside the path', () => {
    expect(pathInProject('~/config/~/nested.yml')).toBe('config/~/nested.yml');
  });

  it('leaves a target that never carried the marker alone', () => {
    expect(pathInProject('lefthook.yml')).toBe('lefthook.yml');
  });
});

describe('choosing what a preset installs into a project', () => {
  it('installs every file the preset promises and nothing else', () => {
    const installed = filesToInstall(['cli'], MY_APP);

    expect(installed.map((file) => file.path)).toStrictEqual(
      CLI_PRESET.files.map((file) => pathInProject(file.target)),
    );
  });

  it('carries the content of each file, not only its name', () => {
    const installed = filesToInstall(['cli'], MY_APP);
    const lefthook = installed.find((file) => file.path === 'lefthook.yml');

    expect(lefthook?.contents).toContain('pre-commit');
  });

  it('puts the project name into the files that carry the token', () => {
    const installed = filesToInstall(['cli'], MY_APP);
    const entry = installed.find((file) => file.path === 'src/main.ts');

    expect(entry?.contents).toContain("name: 'my-app'");
  });

  it('leaves no unresolved token in anything it installs', () => {
    const installed = filesToInstall(['cli'], MY_APP);

    expect(installed.filter((file) => file.contents.includes('__PROJECT_NAME__'))).toStrictEqual(
      [],
    );
  });

  it('installs what the web preset promises when the web preset governs', () => {
    const installed = filesToInstall(['web'], MY_APP);

    expect(installed.map((file) => file.path)).toStrictEqual(
      WEB_PRESET.files.map((file) => pathInProject(file.target)),
    );
  });

  it('accepts what a project is called, whichever preset writes it', () => {
    for (const { name } of registeredPresets()) {
      const vocabulary = filesToInstall([name], { name: 'zzquux', key: 'SHOP' }).find(
        (file) => file.path === 'cspell-words.txt',
      );
      const carried = vocabulary?.contents ?? '';
      const accepted = ['zzquux', 'SHOP'].filter((word) => carried.includes(word));

      expect({ name, accepted }).toStrictEqual({ name, accepted: ['zzquux', 'SHOP'] });
    }
  });

  it('installs nothing for a preset ket has yet to write', () => {
    expect(filesToInstall(['mobile'], MY_APP)).toStrictEqual([]);
  });

  it('installs a file once when two targets share a preset', () => {
    const installed = filesToInstall(['cli', 'cli'], MY_APP);

    expect(installed).toHaveLength(CLI_PRESET.files.length);
  });
});

describe('reading what a preset ships for a path', () => {
  it('finds the contents a preset writes to that path', () => {
    const installed = filesToInstall(['cli'], { name: 'shop', key: 'SHOP' });

    expect(shippedContents(installed, '.gitignore')).toContain('node_modules/');
  });

  it('reports nothing for a path no preset writes', () => {
    expect(
      shippedContents(filesToInstall(['cli'], { name: 'shop', key: 'SHOP' }), 'LICENSE'),
    ).toBeUndefined();
  });

  it('reports nothing when no preset writes anything', () => {
    expect(shippedContents([], '.gitignore')).toBeUndefined();
  });
});
