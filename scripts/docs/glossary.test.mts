import { describe, expect, it } from 'vitest';

import {
  compileAcceptList,
  compileTerminology,
  compileWordList,
  parseGlossary,
} from './glossary.mts';

const glossary = [
  '# Glossary',
  '',
  '## Terms',
  '',
  '| Term | Forbidden | Definition |',
  '| ---- | --------- | ---------- |',
  '| `Bun` | | The runtime that runs everything here. |',
  '| `codebase`, `Codebase` | `code base` | The whole repository of source code. |',
  '| `api`, `API` | | A programming interface. |',
  '| `failover`, `Failover` | `fail-over` | Shifting traffic to the next healthy target. |',
  '',
  '## Words',
  '',
  '| Word | Definition |',
  '| ---- | ---------- |',
  '| `knip` | The dead export linter. |',
  '| `webp` | An image format. |',
  '',
].join('\n');

describe('the glossary parser', () => {
  it('given the two sections, then terms and words come through with their parts', () => {
    const parsed = parseGlossary(glossary);

    expect(parsed.terms).toHaveLength(4);
    expect(parsed.terms[1]?.forms).toEqual(['codebase', 'Codebase']);
    expect(parsed.terms[1]?.forbidden).toEqual(['code base']);
    expect(parsed.terms[1]?.definition).toBe('The whole repository of source code.');
    expect(parsed.words.map((word) => word.forms[0])).toEqual(['knip', 'webp']);
  });

  it('given cells the formatter padded, then rows still come through', () => {
    const padded = [
      '## Terms',
      '',
      '| Term            | Forbidden   | Definition                 |',
      '| --------------- | ----------- | -------------------------- |',
      '| `Bun`           |             | The runtime.               |',
      '',
    ].join('\n');
    const parsed = parseGlossary(padded);

    expect(parsed.terms).toHaveLength(1);
    expect(parsed.terms[0]?.definition).toBe('The runtime.');
  });

  it('given a term without a definition, then parsing fails naming the term', () => {
    const broken = glossary.replace(' The runtime that runs everything here. ', ' ');

    expect(() => parseGlossary(broken)).toThrow(/Bun/u);
  });
});

describe('the Vale accept compile', () => {
  it('given one form, then the pattern enforces that exact casing', () => {
    expect(compileAcceptList(parseGlossary(glossary))).toContain('Bun');
  });

  it('given a lowercase and sentence-case pair, then the pattern brackets the first letter', () => {
    expect(compileAcceptList(parseGlossary(glossary))).toContain('[Cc]odebase');
  });

  it('given a lowercase and uppercase pair, then the pattern accepts any casing', () => {
    expect(compileAcceptList(parseGlossary(glossary))).toContain('(?i)api');
  });

  it('given forms that fit no pattern shape, then the compile refuses naming the term', () => {
    const crooked = glossary.replace('`api`, `API`', '`api`, `aPi`');

    expect(() => compileAcceptList(parseGlossary(crooked))).toThrow(/api/u);
  });

  it('given the glossary, then patterns come out sorted by their letters', () => {
    const lines = compileAcceptList(parseGlossary(glossary)).trimEnd().split('\n');

    expect(lines).toEqual(['(?i)api', 'Bun', '[Cc]odebase', '[Ff]ailover']);
  });
});

describe('the terminology compile', () => {
  it('given forbidden variants, then each one swaps to the approved form', () => {
    const terminology = compileTerminology(parseGlossary(glossary));

    expect(terminology).toContain('extends: substitution');
    expect(terminology).toContain('  code base: codebase');
    expect(terminology).toContain('  fail-over: failover');
  });
});

describe('the word list compile', () => {
  it('given terms and words, then every first form lands once, sorted', () => {
    const words = compileWordList(parseGlossary(glossary)).trimEnd().split('\n');

    expect(words).toEqual(['api', 'Bun', 'codebase', 'failover', 'knip', 'webp']);
  });
});
