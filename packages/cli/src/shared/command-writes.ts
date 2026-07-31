export type CommandWrites = { paths: string[] } | { unreadable: string };

interface Word {
  text: string;
  breaks: boolean;
}

const WORD = /(?:[^\s'"]|'[^']*'|"[^"]*")+/gu;

const QUOTED = /['"]/u;

const QUOTES = /['"]/gu;

// A shell breaks a word on these however they are spelled against it, so
// printf x>src/auth.ts writes the same file printf x > src/auth.ts writes.
const BREAKS = /(&&|\|\||\d*>{1,2}\|?|[;|&])/u;

const REDIRECTS = '>';

const HEREDOC = '<<';

const DASHED_HEREDOC = '<<-';

const FLAG = '-';

const IN_PLACE = '-i';

const MOVES = 'cd';

const EDITS_IN_PLACE = 'sed';

const INLINE = new Set(['-c', '-e', '--eval']);

const INTERPRETERS = new Set([
  'sh',
  'bash',
  'zsh',
  'node',
  'bun',
  'deno',
  'python',
  'python3',
  'ruby',
  'perl',
]);

const WRITES_EVERY_ARGUMENT = new Set(['tee', 'touch', 'rm', 'mv']);

const WRITES_ITS_LAST_ARGUMENT = new Set(['cp', 'install']);

function wordsOf(line: string): Word[] {
  return [...line.matchAll(WORD)].flatMap((found): Word[] => {
    const raw = found[0];

    if (QUOTED.test(raw)) {
      return [{ text: raw.replaceAll(QUOTES, ''), breaks: false }];
    }

    // A split on a capturing pattern hands back the pieces it broke on at every
    // odd position, which is what says a word is an operator rather than a name.
    return raw
      .split(BREAKS)
      .map((text, at) => ({ text, breaks: at % 2 === 1 }))
      .filter((word) => word.text !== '');
  });
}

function isSeparator(word: Word): boolean {
  return word.breaks && !word.text.includes(REDIRECTS);
}

function segmentsOf(words: Word[]): Word[][] {
  const segments: Word[][] = [];
  let current: Word[] = [];

  for (const word of words) {
    if (isSeparator(word)) {
      segments.push(current);
      current = [];
    } else {
      current.push(word);
    }
  }

  segments.push(current);

  return segments;
}

// The delimiter is quoted as often as not, so what marks a heredoc is the
// marker the word opens with rather than whether the word carried quotes.
function opensHeredoc(word: Word): boolean {
  return word.text.startsWith(HEREDOC);
}

function heredocNameIn(text: string): string {
  const marker = text.startsWith(DASHED_HEREDOC) ? DASHED_HEREDOC : HEREDOC;

  return text.slice(marker.length);
}

// A delimiter sits on the marker or in the word after it, and a marker with
// neither names nothing rather than closing on the first blank line.
function namedOrNext(named: string, next: Word | undefined): string {
  return named === '' ? (next?.text ?? '') : named;
}

function delimiterOf(line: string): string | undefined {
  const words = wordsOf(line);

  return words
    .flatMap((word, at) =>
      opensHeredoc(word) ? [namedOrNext(heredocNameIn(word.text), words[at + 1])] : [],
    )
    .find((named) => named !== '');
}

// A heredoc body is data rather than commands, and reading it as commands finds
// a write in every file an agent was quoting.
function withoutHeredocBodies(command: string): string[] {
  let closing: string | undefined;

  return command.split('\n').filter((line) => {
    if (closing === undefined) {
      closing = delimiterOf(line);

      return true;
    }

    if (line.trim() === closing) {
      closing = undefined;
    }

    return false;
  });
}

function isRedirect(word: Word): boolean {
  return word.breaks && word.text.includes(REDIRECTS);
}

// The word after the operator is the file, since a shell breaks the operator
// off whatever it was written against.
function redirectsIn(segment: Word[]): string[] {
  return segment
    .flatMap((word, at) => (isRedirect(word) ? [segment[at + 1]?.text ?? ''] : []))
    .filter((path) => path !== '');
}

// A redirect and the file it names are not arguments to the command that runs.
function spokenIn(segment: Word[]): Word[] {
  const spoken: Word[] = [];
  let naming = false;

  for (const word of segment) {
    if (naming) {
      naming = false;
    } else if (isRedirect(word)) {
      naming = true;
    } else {
      spoken.push(word);
    }
  }

  return spoken;
}

function argumentsOf(given: Word[]): string[] {
  return given
    .filter((word) => !word.text.startsWith(FLAG) && word.text !== '')
    .map((word) => word.text);
}

function editsInPlace(runs: Word, spoken: Word[]): boolean {
  return runs.text === EDITS_IN_PLACE && spoken.some((word) => word.text.startsWith(IN_PLACE));
}

function writtenBy(segment: Word[]): string[] {
  const [runs, ...given] = spokenIn(segment);

  if (runs === undefined) {
    return [];
  }

  const named = argumentsOf(given);

  if (WRITES_EVERY_ARGUMENT.has(runs.text) || editsInPlace(runs, segment)) {
    return named;
  }

  return WRITES_ITS_LAST_ARGUMENT.has(runs.text) ? named.slice(-1) : [];
}

function inlineScriptIn(segment: Word[]): string | undefined {
  const [runs, ...given] = segment;

  if (runs === undefined || !INTERPRETERS.has(runs.text)) {
    return undefined;
  }

  const inline = given.find((word) => INLINE.has(word.text));

  return inline === undefined ? undefined : `${runs.text} ${inline.text}`;
}

function movesDirectory(segments: Word[][]): boolean {
  return segments.some((segment) => segment[0]?.text === MOVES);
}

function unreadableIn(segments: Word[][]): string | undefined {
  return segments.map(inlineScriptIn).find((inline) => inline !== undefined);
}

// Reading is always allowed, so a command naming no written path is waved
// through. What cannot be read confidently and can write is refused instead,
// because an unreadable command that gets waved through is the hole itself.
export function writesOf(command: string): CommandWrites {
  const segments = withoutHeredocBodies(command).flatMap((line) => segmentsOf(wordsOf(line)));
  const inline = unreadableIn(segments);

  if (inline !== undefined) {
    return { unreadable: inline };
  }

  const paths = segments.flatMap((segment) => [...redirectsIn(segment), ...writtenBy(segment)]);

  if (paths.length > 0 && movesDirectory(segments)) {
    return { unreadable: MOVES };
  }

  return { paths: [...new Set(paths)] };
}
