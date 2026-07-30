import { describe, expect, it } from 'vitest';

import { withHarnessRegistered } from './settings.ts';

function parsed(rendered: string): unknown {
  return JSON.parse(rendered);
}

describe('registering the harness in a project that has no settings', () => {
  it('names the marketplace ket publishes from', () => {
    expect(parsed(withHarnessRegistered(''))).toMatchObject({
      extraKnownMarketplaces: { ket: { source: { source: 'github', repo: 'ket-sh/ket' } } },
    });
  });

  it('enables the plugin, so nobody has to install it', () => {
    expect(parsed(withHarnessRegistered(''))).toMatchObject({
      enabledPlugins: { 'ket@ket': true },
    });
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(withHarnessRegistered('').endsWith('\n')).toBe(true);
  });
});

describe('registering the harness beside settings a project already had', () => {
  it('keeps every unrelated setting', () => {
    const existing = JSON.stringify({ model: 'opus', env: { CI: 'true' } });

    expect(parsed(withHarnessRegistered(existing))).toMatchObject({
      model: 'opus',
      env: { CI: 'true' },
    });
  });

  it('keeps a marketplace the project already knew', () => {
    const existing = JSON.stringify({
      extraKnownMarketplaces: { house: { source: { source: 'github', repo: 'acme/plugins' } } },
    });
    const merged = parsed(withHarnessRegistered(existing));

    expect(merged).toMatchObject({
      extraKnownMarketplaces: {
        house: { source: { source: 'github', repo: 'acme/plugins' } },
        ket: { source: { source: 'github', repo: 'ket-sh/ket' } },
      },
    });
  });

  it('keeps a plugin the project already enabled', () => {
    const existing = JSON.stringify({ enabledPlugins: { 'other@house': true } });

    expect(parsed(withHarnessRegistered(existing))).toMatchObject({
      enabledPlugins: { 'other@house': true, 'ket@ket': true },
    });
  });

  it('leaves a project that already registered it unchanged', () => {
    const already = withHarnessRegistered('');

    expect(withHarnessRegistered(already)).toBe(already);
  });
});

describe('settings a project left in no state to merge', () => {
  it('starts fresh rather than throwing on unreadable json', () => {
    expect(parsed(withHarnessRegistered('{ not json'))).toMatchObject({
      enabledPlugins: { 'ket@ket': true },
    });
  });

  it('starts fresh when the file holds something that is not an object', () => {
    expect(parsed(withHarnessRegistered('[1, 2]'))).toMatchObject({
      enabledPlugins: { 'ket@ket': true },
    });
  });
});

describe('settings that hold something no merge can use', () => {
  function keysOf(rendered: string): string[] {
    const merged: unknown = JSON.parse(rendered);

    return typeof merged === 'object' && merged !== null ? Object.keys(merged) : [];
  }

  it('starts fresh on a json array, rather than merging its indexes in', () => {
    expect(keysOf(withHarnessRegistered('[1, 2]'))).toStrictEqual([
      'extraKnownMarketplaces',
      'enabledPlugins',
    ]);
  });

  it('starts fresh on a json string, rather than merging its characters in', () => {
    expect(keysOf(withHarnessRegistered('"hello"'))).toStrictEqual([
      'extraKnownMarketplaces',
      'enabledPlugins',
    ]);
  });

  it('starts fresh on a json number', () => {
    expect(keysOf(withHarnessRegistered('7'))).toStrictEqual([
      'extraKnownMarketplaces',
      'enabledPlugins',
    ]);
  });

  it('starts fresh on a json null, rather than reading fields off it', () => {
    expect(keysOf(withHarnessRegistered('null'))).toStrictEqual([
      'extraKnownMarketplaces',
      'enabledPlugins',
    ]);
  });
});
