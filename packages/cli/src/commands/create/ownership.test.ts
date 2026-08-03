import { describe, expect, it } from 'vitest';

import { ownedFiles } from './ownership.ts';

const INSTALLED = [
  { path: '.github/CODEOWNERS', contents: '* @reyz' },
  { path: '.github/workflows/ci.yml', contents: 'name: ci' },
  { path: 'package.json', contents: '{}' },
];

describe('the ownership file a project keeps only while somebody owns it', () => {
  it('keeps every file, ownership included, when create resolved an owner', () => {
    expect(ownedFiles(INSTALLED, 'reyz')).toStrictEqual(INSTALLED);
  });

  it('drops the ownership file when create resolved no owner', () => {
    expect(ownedFiles(INSTALLED, undefined).map((file) => file.path)).toStrictEqual([
      '.github/workflows/ci.yml',
      'package.json',
    ]);
  });

  it('keeps the contents of everything an unowned project still gets', () => {
    expect(ownedFiles(INSTALLED, undefined)).toStrictEqual([
      { path: '.github/workflows/ci.yml', contents: 'name: ci' },
      { path: 'package.json', contents: '{}' },
    ]);
  });

  it('drops nothing from a project whose preset ships no ownership file', () => {
    const without = [{ path: 'package.json', contents: '{}' }];

    expect(ownedFiles(without, undefined)).toStrictEqual(without);
  });
});
