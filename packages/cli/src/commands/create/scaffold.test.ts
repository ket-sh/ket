import { describe, expect, it } from 'vitest';

import type { Configuration } from '../../shared/configuration.ts';

import { scaffoldFiles, scaffoldFor, withEventsIgnored } from './scaffold.ts';

const DRIVEN: Configuration = {
  key: 'OFS',
  targets: {},
  integrations: [],
  language: 'en',
  workflow: true,
};

const GATED_ONLY: Configuration = { ...DRIVEN, workflow: false };

describe('composing everything init writes', () => {
  it('adds the gitignore change when the rule is missing', () => {
    const paths = scaffoldFor(DRIVEN, 'node_modules/\n').map((file) => file.path);

    expect(paths).toContain('.gitignore');
  });

  it('leaves the gitignore out when the rule is already there', () => {
    const paths = scaffoldFor(DRIVEN, '.ket/events.jsonl\n').map((file) => file.path);

    expect(paths).not.toContain('.gitignore');
  });

  it('keeps the event log out of the diff even for a project that took no pipeline', () => {
    const paths = scaffoldFor(GATED_ONLY, 'node_modules/\n').map((file) => file.path);

    expect(paths).toContain('.gitignore');
  });
});

describe('keeping the event log out of the diff', () => {
  it('adds the ignore rule to a file that lacks it', () => {
    expect(withEventsIgnored('node_modules/\n')).toBe('node_modules/\n.ket/events.jsonl\n');
  });

  it('closes a final line that was left unterminated', () => {
    expect(withEventsIgnored('node_modules/')).toBe('node_modules/\n.ket/events.jsonl\n');
  });

  it('starts the file when there is nothing to add to', () => {
    expect(withEventsIgnored('')).toBe('.ket/events.jsonl\n');
  });

  it('leaves a file that already carries the rule alone', () => {
    expect(withEventsIgnored('.ket/events.jsonl\n')).toBeUndefined();
  });

  it('recognizes the rule through the whitespace around it', () => {
    expect(withEventsIgnored('node_modules/\n  .ket/events.jsonl  \n')).toBeUndefined();
  });
});

describe('deciding what init writes into a repository', () => {
  it('writes a config and a home for items, since ket watch draws the board from them', () => {
    const paths = scaffoldFiles(DRIVEN).map((file) => file.path);

    expect(paths).toStrictEqual(['.ket/config.yaml', '.ket/items/.gitkeep']);
  });

  it('carries the chosen key into the config', () => {
    const [config] = scaffoldFiles(DRIVEN);

    expect(config?.contents).toContain('key: OFS');
  });

  it('carries the targets into the config, so a gate can resolve a preset from a path', () => {
    const [config] = scaffoldFiles({ ...DRIVEN, targets: { 'packages/cli': 'cli' } });

    expect(config?.contents).toContain('packages/cli: cli');
  });

  it('leaves the items directory empty', () => {
    const files = scaffoldFiles(DRIVEN);
    const gitkeep = files.find((file) => file.path.endsWith('.gitkeep'));

    expect(gitkeep?.contents).toBe('');
  });

  it('renders no board, since a generated copy of the items only goes stale', () => {
    expect(scaffoldFiles(DRIVEN).find((file) => file.path.endsWith('BOARD.md'))).toBeUndefined();
  });
});

describe('writing into a repository that took the gates without the pipeline', () => {
  it('writes the config alone, since the gates read it and nothing tracks items', () => {
    expect(scaffoldFiles(GATED_ONLY).map((file) => file.path)).toStrictEqual(['.ket/config.yaml']);
  });

  it('writes no board, because a board with nowhere to draw from would only lie', () => {
    const board = scaffoldFiles(GATED_ONLY).find((file) => file.path.endsWith('BOARD.md'));

    expect(board).toBeUndefined();
  });

  it('opens no home for items, since no command would ever file one', () => {
    const gitkeep = scaffoldFiles(GATED_ONLY).find((file) => file.path.endsWith('.gitkeep'));

    expect(gitkeep).toBeUndefined();
  });

  it('records the refusal in the config, so a later tool reads the choice rather than guessing', () => {
    const [config] = scaffoldFiles(GATED_ONLY);

    expect(config?.contents).toContain('workflow: false');
  });
});
