import { copies, writes } from '@ket/preset';
import { CLI_PRESET } from '@ket/preset-cli';
import { WEB_PRESET } from '@ket/preset-web';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import type { Configuration } from '../../shared/configuration.ts';

import { registeredPresets } from '../../shared/registry.ts';
import { filesToInstall, installedFor, scaffolded, shippedContents } from './install.ts';
import { pathInProject } from './placement.ts';

const HINT = { text: 'Make it yours: edit', code: 'src/entities/welcome' };

const MY_APP = { name: 'my-app', key: 'SHOP', hint: HINT };

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

describe('turning a preset file into what a project receives', () => {
  it('leaves base64 contents untouched by the project name', () => {
    const carried = Buffer.from('__PROJECT_NAME__ stays as bytes').toString('base64');

    expect(scaffolded(copies('hero/bg.mp4', 'public/bg.mp4'), carried, MY_APP)).toStrictEqual({
      path: 'public/bg.mp4',
      contents: carried,
      encoding: 'base64',
    });
  });

  it('substitutes the project name into a text file, marking no encoding', () => {
    const installed = scaffolded(
      writes('main.ts', 'src/main.ts'),
      "name: '__PROJECT_NAME__'",
      MY_APP,
    );

    expect(installed).toStrictEqual({ path: 'src/main.ts', contents: "name: 'my-app'" });
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
      const vocabulary = filesToInstall([name], { name: 'zzquux', key: 'SHOP', hint: HINT }).find(
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
    const installed = filesToInstall(['cli'], { name: 'shop', key: 'SHOP', hint: HINT });

    expect(shippedContents(installed, '.gitignore')).toContain('node_modules/');
  });

  it('reports nothing for a path no preset writes', () => {
    expect(
      shippedContents(
        filesToInstall(['cli'], { name: 'shop', key: 'SHOP', hint: HINT }),
        'LICENSE',
      ),
    ).toBeUndefined();
  });

  it('reports nothing when no preset writes anything', () => {
    expect(shippedContents([], '.gitignore')).toBeUndefined();
  });
});

describe('assembling everything an update compares against', () => {
  const configured: Configuration = {
    key: 'SHOP',
    targets: { '.': 'cli' },
    integrations: ['codecov'],
    language: 'en',
    workflow: true,
  };

  it('composes the preset files, the chosen integrations and the law', () => {
    const paths = installedFor(configured, MY_APP).map((file) => file.path);

    expect(paths).toContain('CLAUDE.md');
    expect(paths).toContain('.github/workflows/coverage.yml');
  });

  it('assembles by the configuration, so declining a choice changes the files', () => {
    const bare = installedFor({ ...configured, integrations: [], workflow: false }, MY_APP);
    const driven = installedFor(configured, MY_APP);
    const written = (files: { path: string; contents: string }[], path: string) =>
      files.find((file) => file.path === path)?.contents;

    expect(bare.map((file) => file.path)).not.toContain('.github/workflows/coverage.yml');
    expect(written(bare, 'CLAUDE.md')).not.toBe(written(driven, 'CLAUDE.md'));
  });

  it('keeps the full English prose package and never lands the core carrier', () => {
    const landed = installedFor(configured, MY_APP);
    const paths = landed.map((file) => file.path);

    expect(paths).toContain('.vale.ini');
    expect(paths).not.toContain('.vale.core.ini');
    expect(landed.find((file) => file.path === '.vale.ini')?.contents).toContain(
      'Microsoft.Passive = error',
    );
  });

  it('lands the core prose gates and the dictionary for another language', () => {
    const landed = installedFor({ ...configured, language: 'tr' }, MY_APP);
    const valeSection = landed.find((file) => file.path === '.vale.ini')?.contents ?? '';

    expect(landed.map((file) => file.path)).not.toContain('.vale.core.ini');
    expect(valeSection).toContain('BasedOnStyles = Vale, ket');
    expect(valeSection).toContain('[CLAUDE.md]');
    expect(landed.find((file) => file.path === 'cspell.json')?.contents).toContain(
      '@cspell/dict-tr-tr/cspell-ext.json',
    );
  });
});
