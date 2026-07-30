const FENCE = '```';

const TICK = '`';

const SEPARATOR = '/';

const CALL = '()';

const PATTERN = '*';

const SCHEME = ':';

const SCOPE = '@';

const UNDERSCORE = '_';

const DOLLAR = '$';

const DIGITS = '0123456789';

interface ReadCitation {
  path: string;
  contents: string;
}

interface UnreadableCitation {
  path: string;
  missing: true;
}

export type Cited = ReadCitation | UnreadableCitation;

export interface Citations {
  paths: string[];
  symbols: string[];
}

export interface CitationCheck {
  read: Cited[];
  symbols: string[];
}

export interface MissingCitations {
  paths: string[];
  symbols: string[];
}

function prose(markdown: string): string[] {
  const lines = markdown.split('\n');
  const opened = lines.findIndex((line) => line.startsWith(FENCE));

  if (opened === -1) {
    return lines;
  }

  const beyond = lines.slice(opened + 1);
  const closed = beyond.findIndex((line) => line.startsWith(FENCE));

  if (closed === -1) {
    return lines.slice(0, opened);
  }

  return [...lines.slice(0, opened), ...prose(beyond.slice(closed + 1).join('\n'))];
}

function spansIn(line: string): string[] {
  return line.split(TICK).filter((_, at) => at % 2 === 1);
}

function isSpacing(letter: string): boolean {
  return letter.trim() === '';
}

function isOneToken(span: string): boolean {
  return !span.split('').some((letter) => isSpacing(letter));
}

function isPath(span: string): boolean {
  return (
    span.includes(SEPARATOR) &&
    !span.includes(PATTERN) &&
    !span.includes(SCHEME) &&
    !span.startsWith(SCOPE)
  );
}

function isLetter(letter: string): boolean {
  return letter.toLowerCase() !== letter.toUpperCase();
}

// charAt past either end answers with an empty string, and every string
// contains one, so the emptiness is checked before the digits are.
function isDigit(letter: string): boolean {
  return letter !== '' && DIGITS.includes(letter);
}

function isLowercase(letter: string): boolean {
  return isLetter(letter) && letter === letter.toLowerCase();
}

function isCapital(letter: string): boolean {
  return isLetter(letter) && letter === letter.toUpperCase();
}

function isIdentifierPart(letter: string): boolean {
  return isLetter(letter) || isDigit(letter) || letter === UNDERSCORE || letter === DOLLAR;
}

function isIdentifier(name: string): boolean {
  const [first, ...rest] = name.split('');

  return (
    first !== undefined &&
    !isDigit(first) &&
    isIdentifierPart(first) &&
    rest.every((letter) => isIdentifierPart(letter))
  );
}

function climbsCase(name: string): boolean {
  return name.split('').some((letter, at) => isLowercase(letter) && isCapital(name.charAt(at + 1)));
}

function looksLikeCode(name: string, span: string): boolean {
  return (
    span.endsWith(CALL) || name.includes(UNDERSCORE) || name.includes(DOLLAR) || climbsCase(name)
  );
}

function symbolIn(span: string): string | undefined {
  const name = span.endsWith(CALL) ? span.slice(0, -CALL.length) : span;

  return isIdentifier(name) && looksLikeCode(name, span) ? name : undefined;
}

function once(names: string[]): string[] {
  return [...new Set(names)];
}

export function citationsFrom(markdown: string): Citations {
  const spans = prose(markdown)
    .flatMap((line) => spansIn(line))
    .filter((span) => isOneToken(span));

  return {
    paths: once(spans.filter((span) => isPath(span))),
    symbols: once(
      spans.map((span) => symbolIn(span)).filter((name): name is string => name !== undefined),
    ),
  };
}

function bounded(contents: string, symbol: string, at: number): boolean {
  return (
    !isIdentifierPart(contents.charAt(at - 1)) &&
    !isIdentifierPart(contents.charAt(at + symbol.length))
  );
}

function holdsFrom(contents: string, symbol: string, from: number): boolean {
  const at = contents.indexOf(symbol, from);

  if (at === -1) {
    return false;
  }

  return bounded(contents, symbol, at) || holdsFrom(contents, symbol, at + 1);
}

function wasRead(cited: Cited): cited is ReadCitation {
  return !('missing' in cited);
}

export function missingFrom(check: CitationCheck): MissingCitations {
  const read = check.read.filter(wasRead);

  return {
    paths: check.read.filter((cited) => !wasRead(cited)).map((cited) => cited.path),
    symbols: check.symbols.filter(
      (symbol) => !read.some((cited) => holdsFrom(cited.contents, symbol, 0)),
    ),
  };
}
