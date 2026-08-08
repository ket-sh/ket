export interface GlossaryEntry {
  forms: string[];
  forbidden: string[];
  definition: string;
}

export interface Glossary {
  terms: GlossaryEntry[];
  words: GlossaryEntry[];
}

const INLINE_CODE = /`(?<token>[^`]+)`/gu;

function tokensOf(cell: string): string[] {
  return [...cell.matchAll(INLINE_CODE)]
    .map((token) => token.groups?.['token'])
    .filter((token): token is string => token !== undefined);
}

const HEADER_CELLS = ['Term', 'Word'];

function isTableRow(line: string): boolean {
  return line.startsWith('|') && !/^\|[\s|:-]+\|$/u.test(line);
}

function isHeaderRow(cells: readonly string[]): boolean {
  return HEADER_CELLS.includes(cells[0] ?? '');
}

function cellsOf(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function forbiddenOf(cells: string[], definitionAt: number): string[] {
  return definitionAt === 2 ? tokensOf(cells[1] ?? '') : [];
}

function entryOf(cells: string[], definitionAt: number): GlossaryEntry {
  const forms = tokensOf(cells[0] ?? '');
  const definition = cells[definitionAt] ?? '';
  const [first] = forms;

  if (first === undefined) {
    throw new Error(`a glossary row names no term: | ${cells.join(' | ')} |`);
  }

  if (definition === '') {
    throw new Error(`the term ${first} carries no definition`);
  }

  return { forms, forbidden: forbiddenOf(cells, definitionAt), definition };
}

function sectionOf(line: string, current: keyof Glossary | undefined): keyof Glossary | undefined {
  if (line.startsWith('## ')) {
    if (line === '## Terms') {
      return 'terms';
    }

    return line === '## Words' ? 'words' : undefined;
  }

  return current;
}

function collectRow(entries: GlossaryEntry[], line: string, section: keyof Glossary): void {
  if (!isTableRow(line)) {
    return;
  }

  const cells = cellsOf(line);

  if (!isHeaderRow(cells)) {
    entries.push(entryOf(cells, section === 'terms' ? 2 : 1));
  }
}

export function parseGlossary(markdown: string): Glossary {
  const glossary: Glossary = { terms: [], words: [] };
  let section: keyof Glossary | undefined = undefined;

  for (const line of markdown.split('\n')) {
    section = sectionOf(line, section);

    if (section !== undefined) {
      collectRow(glossary[section], line, section);
    }
  }

  return glossary;
}

function capitalized(form: string): string {
  return form.slice(0, 1).toUpperCase() + form.slice(1);
}

function casePattern(first: string, second: string): string | undefined {
  if (second === capitalized(first) && first !== capitalized(first)) {
    return `[${first.slice(0, 1).toUpperCase()}${first.slice(0, 1)}]${first.slice(1)}`;
  }

  if (second === first.toUpperCase() && first !== first.toUpperCase()) {
    return `(?i)${first}`;
  }

  return undefined;
}

function unrepresentable(term: string): Error {
  return new Error(`the term ${term} lists forms no accept pattern can carry`);
}

function patternOf(entry: GlossaryEntry): string {
  const [first, second, ...rest] = entry.forms;

  if (first === undefined || rest.length > 0) {
    throw unrepresentable(entry.forms.join(', '));
  }

  if (second === undefined) {
    return first;
  }

  const pattern = casePattern(first, second);

  if (pattern === undefined) {
    throw unrepresentable(first);
  }

  return pattern;
}

function lettersOf(pattern: string): string {
  return pattern
    .replace('(?i)', '')
    .replace(/^\[.(?<kept>.)\]/u, '$<kept>')
    .toLowerCase();
}

function byLetters(left: string, right: string): number {
  const leftKey = lettersOf(left);
  const rightKey = lettersOf(right);

  if (leftKey === rightKey) {
    return left < right ? -1 : 1;
  }

  return leftKey < rightKey ? -1 : 1;
}

export function compileAcceptList(glossary: Glossary): string {
  return glossary.terms.map(patternOf).sort(byLetters).join('\n') + '\n';
}

const TERMINOLOGY_HEADER = [
  '# bun run docs:glossary writes this file from docs/glossary.md.',
  'extends: substitution',
  `message: "One concept, one name: use '%s' instead of '%s'."`,
  'level: error',
  'scope: text',
  'ignorecase: true',
  'swap:',
].join('\n');

export function compileTerminology(glossary: Glossary): string {
  const swaps = glossary.terms
    .flatMap((entry) => entry.forbidden.map((variant) => `  ${variant}: ${entry.forms[0] ?? ''}`))
    .sort((left, right) => (left < right ? -1 : 1));

  return [TERMINOLOGY_HEADER, ...swaps].join('\n') + '\n';
}

export function compileWordList(glossary: Glossary): string {
  const firsts = [...glossary.terms, ...glossary.words]
    .map((entry) => entry.forms[0])
    .filter((form): form is string => form !== undefined);
  const unique = new Map(firsts.map((form) => [form.toLowerCase(), form] as const));

  return [...unique.values()].sort((left, right) => byLetters(left, right)).join('\n') + '\n';
}
