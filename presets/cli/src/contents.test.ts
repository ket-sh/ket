import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contentOf, PRESET_CONTENTS } from './contents.generated.ts';
import { CLI_PRESET } from './item.ts';

const FILES_ROOT = join(import.meta.dirname, '..');

describe('the file contents the preset carries', () => {
  it('carries every file the item promises', () => {
    for (const file of CLI_PRESET.files) {
      expect(contentOf(file.path)).toBeTypeOf('string');
    }
  });

  it('matches what sits on disk, byte for byte', async () => {
    for (const [path, carried] of Object.entries(PRESET_CONTENTS)) {
      expect(carried).toBe(await readFile(join(FILES_ROOT, path), 'utf8'));
    }
  });

  it('carries no file the item never promised', () => {
    const promised = new Set(CLI_PRESET.files.map((file) => file.path));

    expect(Object.keys(PRESET_CONTENTS).filter((path) => !promised.has(path))).toStrictEqual([]);
  });

  it('carries the real config, not a placeholder', () => {
    expect(contentOf('files/oxlintrc.json')).toContain('plugins');
    expect(contentOf('files/lefthook.yml')).toContain('pre-commit');
  });

  it('refuses a path the preset never shipped, naming it', () => {
    expect(() => contentOf('files/nowhere.json')).toThrow(
      'the cli preset promises files/nowhere.json but ships no such file',
    );
  });
});
