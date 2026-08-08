import { describe, expect, it } from 'vitest';

import { LEGACY_STATE, legacyRefusal } from './legacy.ts';

describe('the state names an older ket left behind', () => {
  it('names every file whose name changed, so a reader can find them all', () => {
    expect(LEGACY_STATE).toStrictEqual([
      '.ket/config.ts',
      '.ket/toolchain.json',
      '.ket/scaffold.json',
    ]);
  });
});

describe('a project scaffolded before ket kept its state in yaml', () => {
  it('says nothing when no old name is left, so a current project updates as it always did', () => {
    expect(legacyRefusal([])).toBeUndefined();
  });

  it('refuses a configuration ket would have to run, naming the rewrite it needs', () => {
    const refusal = legacyRefusal(['.ket/config.ts']);

    expect(refusal).toContain('update cannot rewrite it for you');
    expect(refusal).toContain('rewrite .ket/config.ts as .ket/config.yaml');
  });

  it('names a machine record as a plain rename, since json is already yaml', () => {
    expect(legacyRefusal(['.ket/toolchain.json'])).toContain(
      'rename .ket/toolchain.json to .ket/toolchain.yaml',
    );
  });

  it('names the scaffold record the same way', () => {
    expect(legacyRefusal(['.ket/scaffold.json'])).toContain(
      'rename .ket/scaffold.json to .ket/scaffold.yaml',
    );
  });

  it('names every old file at once, so one run says all the work there is', () => {
    const refusal = legacyRefusal(LEGACY_STATE);

    expect(refusal).toContain('.ket/config.yaml');
    expect(refusal).toContain('.ket/toolchain.yaml');
    expect(refusal).toContain('.ket/scaffold.yaml');
  });

  it('says nothing about a file the project never had', () => {
    expect(legacyRefusal(['.ket/config.ts'])).not.toContain('toolchain');
  });
});
