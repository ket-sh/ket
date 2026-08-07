import { describe, expect, it } from 'vitest';

import { homeArgv } from './usage.ts';

describe('what a bare ket does with no argument at all', () => {
  it('opens the board when a person is watching a terminal', () => {
    expect(homeArgv([], true)).toStrictEqual(['watch']);
  });

  it('keeps printing usage when standard output goes to a pipe', () => {
    expect(homeArgv([], false)).toStrictEqual([]);
  });

  it('leaves a named command alone on a terminal', () => {
    expect(homeArgv(['create', 'shop'], true)).toStrictEqual(['create', 'shop']);
  });

  it('leaves a help request alone rather than opening the board over it', () => {
    expect(homeArgv(['--help'], true)).toStrictEqual(['--help']);
  });
});

import { usageRequest } from './usage.ts';

describe('deciding whose usage to print', () => {
  it('asks for the top-level usage when nothing was given', () => {
    expect(usageRequest([])).toBe('top-level');
  });

  it('asks for the top-level usage for a bare help flag', () => {
    expect(usageRequest(['--help'])).toBe('top-level');
    expect(usageRequest(['-h'])).toBe('top-level');
  });

  it('asks for a command usage when help follows a command', () => {
    expect(usageRequest(['create', '--help'])).toBe('command');
    expect(usageRequest(['create', '--cwd', '/work', '-h'])).toBe('command');
  });

  it('asks for no usage from an ordinary invocation', () => {
    expect(usageRequest(['create', '--cwd', '/work'])).toBe('none');
  });
});
