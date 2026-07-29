const SHORTEST_WORD = 2;

const LONGEST_KEY = 10;

const SINGLE_WORD_LETTERS = 4;

function meaningfulWords(repositoryName: string): string[] {
  return repositoryName.split(/[^a-zA-Z]/).filter((word) => word.length >= SHORTEST_WORD);
}

export function deriveProjectKey(repositoryName: string): string | undefined {
  const words = meaningfulWords(repositoryName);
  const [first] = words;

  if (first === undefined) {
    return undefined;
  }

  if (words.length === 1) {
    return first.slice(0, SINGLE_WORD_LETTERS).toUpperCase();
  }

  return words
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, LONGEST_KEY)
    .toUpperCase();
}
