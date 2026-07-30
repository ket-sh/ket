import { describe, expect, it } from 'vitest';

import { scaffoldFiles, scaffoldFor, withEventsIgnored } from './scaffold.ts';

describe('composing everything init writes', () => {
  it('adds the gitignore change when the rule is missing', () => {
    const paths = scaffoldFor({ key: 'OFS', targets: {} }, 'node_modules/\n').map(
      (file) => file.path,
    );

    expect(paths).toContain('.gitignore');
  });

  it('leaves the gitignore out when the rule is already there', () => {
    const paths = scaffoldFor({ key: 'OFS', targets: {} }, '.ket/events.jsonl\n').map(
      (file) => file.path,
    );

    expect(paths).not.toContain('.gitignore');
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
  it('writes a config, a board and a home for items', () => {
    const paths = scaffoldFiles({ key: 'OFS', targets: {} }).map((file) => file.path);

    expect(paths).toStrictEqual(['.ket/config.ts', '.ket/BOARD.md', '.ket/items/.gitkeep']);
  });

  it('carries the chosen key into the config', () => {
    const [config] = scaffoldFiles({ key: 'OFS', targets: {} });

    expect(config?.contents).toContain("key: 'OFS'");
  });

  it('carries the targets into the config, so a gate can resolve a preset from a path', () => {
    const [config] = scaffoldFiles({ key: 'OFS', targets: { 'packages/cli': 'cli' } });

    expect(config?.contents).toContain("'packages/cli': 'cli'");
  });

  it('leaves the items directory empty', () => {
    const files = scaffoldFiles({ key: 'OFS', targets: {} });
    const gitkeep = files.find((file) => file.path.endsWith('.gitkeep'));

    expect(gitkeep?.contents).toBe('');
  });

  it('names the board so it reads on its own', () => {
    const board = scaffoldFiles({ key: 'OFS', targets: {} }).find((file) =>
      file.path.endsWith('BOARD.md'),
    );

    expect(board?.contents).toContain('# OFS board');
  });
});
