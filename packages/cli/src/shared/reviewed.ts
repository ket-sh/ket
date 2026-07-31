const REVIEW = '"gate":"review"';

const ITEM = '"item":"';

const CLOSES = '"';

// A log line is scanned rather than parsed, the way an item file is. Parsing
// needs an exception path whose two spellings mean the same thing, and a line
// nobody can read is dropped either way.
function itemIn(line: string): string | undefined {
  if (!line.includes(REVIEW)) {
    return undefined;
  }

  const opens = line.indexOf(ITEM);

  if (opens === -1) {
    return undefined;
  }

  const from = opens + ITEM.length;
  const closes = line.indexOf(CLOSES, from);

  return closes === -1 ? undefined : line.slice(from, closes);
}

// A skip is an answer as much as a review is. What the gate asks is whether
// somebody decided, not whether they decided in its favour.
export function reviewedIn(log: string): string[] {
  const named = log
    .split('\n')
    .map(itemIn)
    .filter((item): item is string => item !== undefined && item !== '');

  return [...new Set(named)].toSorted();
}
