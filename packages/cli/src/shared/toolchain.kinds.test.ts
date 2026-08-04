import { describe, expect, it } from 'vitest';

import { kindArrivalsIn } from './toolchain.ts';

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
