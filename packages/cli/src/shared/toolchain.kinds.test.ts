import { describe, expect, it } from 'vitest';

import { kindArrivalsIn, kindOf } from './toolchain.ts';

describe('the kind a path carries', () => {
  it('reads the extension a file name ends in', () => {
    expect(kindOf('infra/main.tf')).toBe('.tf');
  });

  it('reads the last extension, since a name may carry more than one dot', () => {
    expect(kindOf('src/env.d.ts')).toBe('.ts');
  });

  it('reads no kind from a path whose last segment holds no dot', () => {
    expect(kindOf('Dockerfile')).toBeUndefined();
  });

  it('reads no kind from a dotfile, whose dot opens the name rather than an extension', () => {
    expect(kindOf('.gitignore')).toBeUndefined();
  });

  it('reads no kind from a dotfile inside a directory, since the dot still opens its name', () => {
    expect(kindOf('infra/.gitignore')).toBeUndefined();
  });
});

describe('the kinds that arrived with a write', () => {
  it('names the kind a write brought that the preset never ships', () => {
    expect(kindArrivalsIn({ written: 'infra/main.tf', shipped: ['.ts'], seen: [] })).toStrictEqual([
      '.tf',
    ]);
  });

  it('says nothing about a kind the preset already ships', () => {
    expect(kindArrivalsIn({ written: 'src/app.ts', shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });

  it('says nothing about a kind it has already named once', () => {
    expect(
      kindArrivalsIn({ written: 'infra/main.tf', shipped: ['.ts'], seen: ['.tf'] }),
    ).toStrictEqual([]);
  });

  it('says nothing when no write named a path', () => {
    expect(kindArrivalsIn({ written: undefined, shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });

  it('says nothing about a write whose path carries no kind', () => {
    expect(kindArrivalsIn({ written: 'Dockerfile', shipped: ['.ts'], seen: [] })).toStrictEqual([]);
  });
});
