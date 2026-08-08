import { readFileSync } from 'node:fs';

import {
  compileAcceptList,
  compileTerminology,
  compileWordList,
  parseGlossary,
} from './glossary.mts';

export const GLOSSARY_PATH = 'docs/glossary.md';

export interface GlossaryOutput {
  path: string;
  content: string;
}

export function compiledOutputs(): GlossaryOutput[] {
  const glossary = parseGlossary(readFileSync(GLOSSARY_PATH, 'utf-8'));

  return [
    { path: '.vale/styles/ket/Terminology.yml', content: compileTerminology(glossary) },
    {
      path: '.vale/styles/config/vocabularies/ket/accept.txt',
      content: compileAcceptList(glossary),
    },
    { path: 'cspell-words.txt', content: compileWordList(glossary) },
  ];
}
