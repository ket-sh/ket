import type { ScaffoldFile } from '../write-files.ts';

export const DEFAULT_LANGUAGE = 'en';

interface LanguageDictionary {
  installs: string;
  imports: string;
  speaks: string;
}

// Seeded from the cspell-dicts catalog. A row joins once its package and
// version are verified against a live cspell run.
const DICTIONARIES: Record<string, LanguageDictionary> = {
  tr: {
    installs: '@cspell/dict-tr-tr@3.0.6',
    imports: '@cspell/dict-tr-tr/cspell-ext.json',
    speaks: 'tr',
  },
};

const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/;

const FULL_PROSE_CONFIG = '.vale.ini';

const CORE_PROSE_CONFIG = '.vale.core.ini';

const SPELL_CONFIG = 'cspell.json';

const PROSE_FILES = '**/*.md';

export function refuseLanguage(given: string): string | undefined {
  return LANGUAGE_TAG.test(given)
    ? undefined
    : `the documentation language is a lowercase tag like en or tr, and ${given === '' ? 'nothing' : given} arrived`;
}

export function dictionaryInstallsFor(language: string): string[] {
  const dictionary = DICTIONARIES[language];

  return dictionary === undefined ? [] : [dictionary.installs];
}

function parsedRecord(source: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(source);

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'the shipped cspell.json is not a JSON object, so the language cannot land in it',
    );
  }

  return { ...parsed };
}

function overridesOf(record: Record<string, unknown>): unknown[] {
  const held = record['overrides'];

  return Array.isArray(held) ? held : [];
}

function taught(source: string, dictionary: LanguageDictionary): string {
  const record = parsedRecord(source);
  const held = record['import'];
  const imports: unknown[] = Array.isArray(held) ? held : [];

  record['import'] = [...imports, dictionary.imports];
  record['overrides'] = [
    ...overridesOf(record),
    { filename: PROSE_FILES, language: `en,${dictionary.speaks}` },
  ];

  return `${JSON.stringify(record, null, 2)}\n`;
}

function silenced(source: string): string {
  const record = parsedRecord(source);

  record['overrides'] = [
    ...overridesOf(record),
    { filename: [PROSE_FILES, '!CLAUDE.md'], enabled: false },
  ];

  return `${JSON.stringify(record, null, 2)}\n`;
}

function rewrittenSpell(language: string, source: string): string {
  const dictionary = DICTIONARIES[language];

  return dictionary === undefined ? silenced(source) : taught(source, dictionary);
}

function spokenIn(language: string, file: ScaffoldFile): ScaffoldFile {
  if (file.path === CORE_PROSE_CONFIG) {
    return { ...file, path: FULL_PROSE_CONFIG };
  }

  if (file.path === SPELL_CONFIG) {
    return { ...file, contents: rewrittenSpell(language, file.contents) };
  }

  return file;
}

export function landingTheProse(language: string): (installed: ScaffoldFile[]) => ScaffoldFile[] {
  if (language === DEFAULT_LANGUAGE) {
    return (installed) => installed.filter((file) => file.path !== CORE_PROSE_CONFIG);
  }

  return (installed) =>
    installed
      .filter((file) => file.path !== FULL_PROSE_CONFIG)
      .map((file) => spokenIn(language, file));
}
