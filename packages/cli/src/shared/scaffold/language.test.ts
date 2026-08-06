import { describe, expect, it } from 'vitest';

import { dictionaryInstallsFor, landingTheProse, refuseLanguage } from './language.ts';

const CSPELL = JSON.stringify({ language: 'en', overrides: [{ filename: '**/*.test.ts' }] });

const INSTALLED = [
  { path: '.vale.ini', contents: 'the full package\n' },
  { path: '.vale.core.ini', contents: 'the core package\n' },
  { path: 'cspell.json', contents: CSPELL },
  { path: 'CLAUDE.md', contents: 'the law\n' },
];

function contentsAt(files: { path: string; contents: string }[], path: string): string {
  return files.find((file) => file.path === path)?.contents ?? '';
}

describe('the language tag create accepts', () => {
  it('accepts a lowercase tag, with or without a region', () => {
    expect(refuseLanguage('en')).toBeUndefined();
    expect(refuseLanguage('tr')).toBeUndefined();
    expect(refuseLanguage('pt-br')).toBeUndefined();
  });

  it('refuses anything else and names what arrived', () => {
    expect(refuseLanguage('TR')).toContain('and TR arrived');
    expect(refuseLanguage('Turkish')).toContain('and Turkish arrived');
    expect(refuseLanguage('tr_TR')).toContain('and tr_TR arrived');
  });

  it('says nothing arrived when nothing arrived', () => {
    expect(refuseLanguage('')).toContain('and nothing arrived');
  });
});

describe('the dictionary pin a language brings', () => {
  it('pins the verified Turkish dictionary', () => {
    expect(dictionaryInstallsFor('tr')).toStrictEqual(['@cspell/dict-tr-tr@3.0.6']);
  });

  it('pins nothing for English or for a language without a dictionary', () => {
    expect(dictionaryInstallsFor('en')).toStrictEqual([]);
    expect(dictionaryInstallsFor('xx')).toStrictEqual([]);
  });
});

describe('the prose files English keeps', () => {
  it('keeps every byte and drops only the unused core carrier', () => {
    const landed = landingTheProse('en')(INSTALLED);

    expect(landed.map((file) => file.path)).toStrictEqual([
      '.vale.ini',
      'cspell.json',
      'CLAUDE.md',
    ]);
    expect(contentsAt(landed, '.vale.ini')).toBe('the full package\n');
    expect(contentsAt(landed, 'cspell.json')).toBe(CSPELL);
  });
});

describe('the prose files another language lands', () => {
  it('lands the core config at the gate address and drops the full one', () => {
    const landed = landingTheProse('tr')(INSTALLED);

    expect(landed.map((file) => file.path)).toStrictEqual([
      '.vale.ini',
      'cspell.json',
      'CLAUDE.md',
    ]);
    expect(contentsAt(landed, '.vale.ini')).toBe('the core package\n');
  });

  it('teaches cspell the language when a dictionary exists', () => {
    const rewritten: unknown = JSON.parse(
      contentsAt(landingTheProse('tr')(INSTALLED), 'cspell.json'),
    );

    expect(rewritten).toMatchObject({
      import: ['@cspell/dict-tr-tr/cspell-ext.json'],
      overrides: [{ filename: '**/*.test.ts' }, { filename: '**/*.md', language: 'en,tr' }],
    });
  });

  it('takes cspell off the project prose when no dictionary exists', () => {
    const rewritten: unknown = JSON.parse(
      contentsAt(landingTheProse('xx')(INSTALLED), 'cspell.json'),
    );

    expect(rewritten).toMatchObject({
      overrides: [
        { filename: '**/*.test.ts' },
        { filename: ['**/*.md', '!CLAUDE.md'], enabled: false },
      ],
    });
    expect(Reflect.get(rewritten ?? {}, 'import')).toBeUndefined();
  });
});

describe('what the cspell rewrite survives', () => {
  it('keeps an import the preset already carries', () => {
    const shipped = [
      { path: 'cspell.json', contents: JSON.stringify({ import: ['./house.json'] }) },
    ];
    const rewritten: unknown = JSON.parse(
      contentsAt(landingTheProse('tr')(shipped), 'cspell.json'),
    );

    expect(rewritten).toMatchObject({
      import: ['./house.json', '@cspell/dict-tr-tr/cspell-ext.json'],
      overrides: [{ filename: '**/*.md', language: 'en,tr' }],
    });
  });

  it('refuses a shipped cspell that is not a JSON object', () => {
    for (const broken of ['null', '"words"', '[]']) {
      expect(() => landingTheProse('tr')([{ path: 'cspell.json', contents: broken }])).toThrow(
        /not a JSON object/,
      );
    }
  });
});
