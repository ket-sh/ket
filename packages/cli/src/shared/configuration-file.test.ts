import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Configuration } from './configuration.ts';

import { configurationIn, readConfiguration, renderConfiguration } from './configuration-file.ts';

const SETTLED: Configuration = {
  key: 'SHOP',
  targets: { '.': 'cli' },
  integrations: [],
  language: 'en',
  workflow: true,
};

function readBack(configuration: Configuration): Configuration | undefined {
  const reading = readConfiguration(renderConfiguration(configuration));

  return 'configuration' in reading ? reading.configuration : undefined;
}

describe('the settings a project declares', () => {
  it('reads back every setting it was written with, so the file is data and not code', () => {
    expect(
      readBack({
        key: 'OFS',
        targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
        integrations: ['codecov', 'coderabbit'],
        language: 'tr',
        workflow: false,
      }),
    ).toStrictEqual({
      key: 'OFS',
      targets: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
      integrations: ['codecov', 'coderabbit'],
      language: 'tr',
      workflow: false,
    });
  });

  it('is written as yaml, so nothing has to run the project to read it', () => {
    expect(renderConfiguration(SETTLED)).toBe(
      [
        'key: SHOP',
        'targets:',
        '  .: cli',
        'integrations: []',
        'language: en',
        'workflow: true',
        '',
      ].join('\n'),
    );
  });

  it('keeps a project that maps no target readable, rather than folding the field away', () => {
    expect(readBack({ ...SETTLED, targets: {} })).toBeUndefined();
    expect(renderConfiguration({ ...SETTLED, targets: {} })).toContain('targets: {}');
  });
});

describe('a configuration a project left something out of', () => {
  it('takes English when the file names no language, so an old file still reads', () => {
    const reading = readConfiguration('key: SHOP\ntargets:\n  .: cli\n');

    expect('configuration' in reading && reading.configuration.language).toBe('en');
  });

  it('takes the pipeline when the file names no workflow', () => {
    const reading = readConfiguration('key: SHOP\ntargets:\n  .: cli\n');

    expect('configuration' in reading && reading.configuration.workflow).toBe(true);
  });

  it('takes no integrations when the file names none', () => {
    const reading = readConfiguration('key: SHOP\ntargets:\n  .: cli\n');

    expect('configuration' in reading && reading.configuration.integrations).toStrictEqual([]);
  });
});

describe('a setting a person left blank, which yaml reads as nothing at all', () => {
  const BLANK = 'key: SHOP\ntargets:\n  .: cli\nintegrations:\nlanguage:\nworkflow:\n';

  it('reads a blank language as English, the same as leaving the line out', () => {
    const reading = readConfiguration(BLANK);

    expect('configuration' in reading && reading.configuration.language).toBe('en');
  });

  it('reads a blank workflow as the pipeline, the same as leaving the line out', () => {
    const reading = readConfiguration(BLANK);

    expect('configuration' in reading && reading.configuration.workflow).toBe(true);
  });

  it('reads blank integrations as none, the same as leaving the line out', () => {
    const reading = readConfiguration(BLANK);

    expect('configuration' in reading && reading.configuration.integrations).toStrictEqual([]);
  });

  it('refuses a blank target map, since a project nothing governs is not configured', () => {
    expect(readConfiguration('key: SHOP\ntargets:\n')).toStrictEqual({
      refusals: ['the configuration maps no directory to a preset'],
    });
  });

  it('refuses a file emptied out entirely, rather than reading it as settings', () => {
    expect(readConfiguration('')).toStrictEqual({
      refusals: ['the configuration is not a mapping of settings'],
    });
  });
});

describe('a configuration nothing can act on', () => {
  it('refuses a file that is not yaml, naming it rather than throwing', () => {
    const reading = readConfiguration('key: [SHOP\n');

    expect(
      'refusals' in reading && reading.refusals[0]?.startsWith('the configuration is not yaml'),
    ).toBe(true);
  });

  it('refuses a file that is not a mapping of settings', () => {
    expect(readConfiguration('- SHOP\n')).toStrictEqual({
      refusals: ['the configuration is not a mapping of settings'],
    });
  });

  it('refuses a configuration that names no project key, since items are keyed from it', () => {
    expect(readConfiguration('targets:\n  .: cli\n')).toStrictEqual({
      refusals: ['the configuration declares no project key'],
    });
  });

  it('refuses an empty project key the same as a missing one', () => {
    expect(readConfiguration("key: ''\ntargets:\n  .: cli\n")).toStrictEqual({
      refusals: ['the configuration declares no project key'],
    });
  });

  it('refuses a configuration that maps no directory to a preset', () => {
    expect(readConfiguration('key: SHOP\ntargets: {}\n')).toStrictEqual({
      refusals: ['the configuration maps no directory to a preset'],
    });
  });

  it('refuses a target named for a preset ket does not govern, rather than dropping it', () => {
    expect(readConfiguration('key: SHOP\ntargets:\n  app: banana\n')).toStrictEqual({
      refusals: ['the target app names banana, which ket does not govern'],
    });
  });
});

describe('a setting written in a shape the file cannot mean', () => {
  it('refuses integrations that are not a list of names', () => {
    expect(
      readConfiguration('key: SHOP\ntargets:\n  .: cli\nintegrations: codecov\n'),
    ).toStrictEqual({
      refusals: ['the integrations are not a list of names'],
    });
  });

  it('refuses a list holding something that is not a name, rather than keeping the rest', () => {
    expect(
      readConfiguration('key: SHOP\ntargets:\n  .: cli\nintegrations:\n  - 7\n  - codecov\n'),
    ).toStrictEqual({
      refusals: ['the integrations are not a list of names'],
    });
  });

  it('refuses a language that is not a name', () => {
    expect(readConfiguration('key: SHOP\ntargets:\n  .: cli\nlanguage: 7\n')).toStrictEqual({
      refusals: ['the language is not a name'],
    });
  });

  it('refuses a workflow that is not a yes or a no', () => {
    expect(readConfiguration('key: SHOP\ntargets:\n  .: cli\nworkflow: maybe\n')).toStrictEqual({
      refusals: ['the workflow is not true or false'],
    });
  });

  it('carries every refusal at once, so one read says everything that is wrong', () => {
    expect(readConfiguration('language: 7\nworkflow: maybe\n')).toStrictEqual({
      refusals: [
        'the configuration declares no project key',
        'the configuration maps no directory to a preset',
        'the language is not a name',
        'the workflow is not true or false',
      ],
    });
  });
});

describe('reading the configuration off a repository', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ket-configuration-'));
    await mkdir(join(root, '.ket'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads a repository that never wrote one as absent', async () => {
    expect(await configurationIn(root)).toStrictEqual({ absent: true });
  });

  it('reads the configuration out of the ket directory', async () => {
    await writeFile(join(root, '.ket', 'config.yaml'), renderConfiguration(SETTLED));

    expect(await configurationIn(root)).toStrictEqual({ configuration: SETTLED });
  });

  it('looks only inside the ket directory, never beside it', async () => {
    await writeFile(join(root, 'config.yaml'), renderConfiguration(SETTLED));

    expect(await configurationIn(root)).toStrictEqual({ absent: true });
  });

  it('carries a refusal back rather than throwing it', async () => {
    await writeFile(join(root, '.ket', 'config.yaml'), 'targets:\n  .: cli\n');

    expect(await configurationIn(root)).toStrictEqual({
      refusals: ['the configuration declares no project key'],
    });
  });
});
