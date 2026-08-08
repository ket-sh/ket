import { describe, expect, it } from 'vitest';

import { contentOf } from './contents.ts';

describe('the file contents the cli preset carries', () => {
  it('carries the real config, not a placeholder', () => {
    expect(contentOf('files/oxlintrc.json')).toContain('plugins');
    expect(contentOf('files/lefthook.yml')).toContain('pre-commit');
  });

  it('refuses a path the cli preset never shipped, naming itself and the path', () => {
    expect(() => contentOf('files/nowhere.json')).toThrow(
      'the ket-cli preset promises files/nowhere.json but ships no such file',
    );
  });

  it('keeps the machine state out of the spell gate, and the human documents in it', () => {
    const spell = contentOf('files/cspell.json');

    expect(spell).toContain('.ket/scaffold.yaml');
    expect(spell).toContain('.ket/events.jsonl');
    expect(spell).toContain('.ket/toolchain.yaml');
    expect(spell).not.toContain('".ket"');
  });
});
