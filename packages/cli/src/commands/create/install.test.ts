import { CLI_PRESET } from '@ket/preset-cli';
import { describe, expect, it } from 'vitest';

import { filesToInstall, pathInProject } from './install.ts';

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
    const installed = filesToInstall(['cli'], 'my-app');

    expect(installed.map((file) => file.path)).toStrictEqual(
      CLI_PRESET.files.map((file) => pathInProject(file.target)),
    );
  });

  it('carries the content of each file, not only its name', () => {
    const installed = filesToInstall(['cli'], 'my-app');
    const lefthook = installed.find((file) => file.path === 'lefthook.yml');

    expect(lefthook?.contents).toContain('pre-commit');
  });

  it('puts the project name into the files that carry the token', () => {
    const installed = filesToInstall(['cli'], 'my-app');
    const entry = installed.find((file) => file.path === 'src/main.ts');

    expect(entry?.contents).toContain("name: 'my-app'");
  });

  it('leaves no unresolved token in anything it installs', () => {
    const installed = filesToInstall(['cli'], 'my-app');

    expect(installed.filter((file) => file.contents.includes('__PROJECT_NAME__'))).toStrictEqual(
      [],
    );
  });

  it('installs nothing for a preset ket has yet to write', () => {
    expect(filesToInstall(['web'], 'my-app')).toStrictEqual([]);
  });

  it('installs a file once when two targets share a preset', () => {
    const installed = filesToInstall(['cli', 'cli'], 'my-app');

    expect(installed).toHaveLength(CLI_PRESET.files.length);
  });
});
