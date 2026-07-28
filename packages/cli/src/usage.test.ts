import { describe, expect, it } from 'vitest';

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
    expect(usageRequest(['init', '--help'])).toBe('command');
    expect(usageRequest(['init', '--cwd', '/work', '-h'])).toBe('command');
  });

  it('asks for no usage from an ordinary invocation', () => {
    expect(usageRequest(['init', '--cwd', '/work'])).toBe('none');
  });
});
