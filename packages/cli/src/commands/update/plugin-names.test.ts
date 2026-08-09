import { describe, expect, it } from 'vitest';

import { withCurrentPluginNames } from './plugin-names.ts';

function rendered(enabled: Record<string, unknown>): string {
  return `${JSON.stringify({ enabledPlugins: enabled }, undefined, 2)}\n`;
}

function migrated(enabled: Record<string, unknown>): unknown {
  const current = withCurrentPluginNames(rendered(enabled));

  return current === undefined ? undefined : JSON.parse(current);
}

describe('settings whose plugins an older ket enabled', () => {
  it('renames the gates key a project enabled alone, so declining the workflow survives', () => {
    expect(migrated({ 'ket@ket': true })).toStrictEqual({
      enabledPlugins: { 'ket-gates@ket': true },
    });
  });

  it('renames both keys for a project that took the workflow', () => {
    expect(migrated({ 'ket@ket': true, 'ket-workflow@ket': true })).toStrictEqual({
      enabledPlugins: { 'ket-gates@ket': true, 'ket@ket': true },
    });
  });

  it('renames the workflow key even beside the current gates key', () => {
    expect(migrated({ 'ket-gates@ket': true, 'ket-workflow@ket': true })).toStrictEqual({
      enabledPlugins: { 'ket-gates@ket': true, 'ket@ket': true },
    });
  });

  it('carries a disabled choice across the rename', () => {
    expect(migrated({ 'ket@ket': true, 'ket-workflow@ket': false })).toStrictEqual({
      enabledPlugins: { 'ket-gates@ket': true, 'ket@ket': false },
    });
  });

  it('keeps every unrelated setting and every foreign plugin', () => {
    const held = `${JSON.stringify(
      {
        model: 'opus',
        enabledPlugins: { 'other@house': false, 'ket@ket': true },
      },
      undefined,
      2,
    )}\n`;

    expect(JSON.parse(withCurrentPluginNames(held) ?? '{}')).toStrictEqual({
      model: 'opus',
      enabledPlugins: { 'other@house': false, 'ket-gates@ket': true },
    });
  });

  it('writes the two-space shape create writes, ending with a newline', () => {
    expect(withCurrentPluginNames('{"enabledPlugins":{"ket@ket":true}}')).toBe(
      rendered({ 'ket-gates@ket': true }),
    );
  });
});

describe('settings already under the current names', () => {
  it('says nothing about a project that took the workflow', () => {
    expect(migrated({ 'ket-gates@ket': true, 'ket@ket': true })).toBeUndefined();
  });

  it('says nothing about a project that declined it', () => {
    expect(migrated({ 'ket-gates@ket': true })).toBeUndefined();
  });

  it('says nothing where only foreign plugins are enabled', () => {
    expect(migrated({ 'other@house': true })).toBeUndefined();
  });
});

describe('settings no migration can read', () => {
  it('says nothing about an empty file', () => {
    expect(withCurrentPluginNames('')).toBeUndefined();
  });

  it('says nothing about unreadable json', () => {
    expect(withCurrentPluginNames('{ not json')).toBeUndefined();
  });

  it('says nothing about a file that holds no object', () => {
    expect(withCurrentPluginNames('[1, 2]')).toBeUndefined();
  });

  it('says nothing where no plugins are enabled at all', () => {
    expect(withCurrentPluginNames('{}')).toBeUndefined();
  });

  it('says nothing where the enabled plugins hold no record', () => {
    expect(withCurrentPluginNames('{"enabledPlugins": 7}')).toBeUndefined();
  });
});
