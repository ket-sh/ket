export interface DocPage {
  category: string | undefined;
  sources: string[];
  stamp: string | undefined;
}

const FENCE = '---';

const LIST_ITEM = '  - ';

function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0] !== FENCE) {
    return -1;
  }

  return lines.indexOf(FENCE, 1);
}

function scalarOf(lines: readonly string[], key: string): string | undefined {
  const prefix = `${key}: `;

  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length);
}

function sourcesIn(lines: readonly string[]): string[] {
  const opener = lines.findIndex((line) => line.startsWith('sources:'));

  if (opener === -1) {
    return [];
  }

  if (lines[opener] !== 'sources:') {
    throw new Error(
      `frontmatter sources must be a list: put each glob on its own '${LIST_ITEM}' line`,
    );
  }

  const globs: string[] = [];

  for (const line of lines.slice(opener + 1)) {
    if (!line.startsWith(LIST_ITEM)) {
      break;
    }

    globs.push(line.slice(LIST_ITEM.length));
  }

  return globs;
}

export function parsePage(markdown: string): DocPage {
  const lines = markdown.split('\n');
  const end = frontmatterEnd(lines);

  if (end === -1) {
    return { category: undefined, sources: [], stamp: undefined };
  }

  const frontmatter = lines.slice(1, end);

  return {
    category: scalarOf(frontmatter, 'category'),
    sources: sourcesIn(frontmatter),
    stamp: scalarOf(frontmatter, 'stamp'),
  };
}

export function stampedPage(markdown: string, stamp: string): string {
  const lines = markdown.split('\n');
  const end = frontmatterEnd(lines);

  if (end === -1) {
    throw new Error('the page carries no frontmatter to stamp');
  }

  const at = lines.slice(0, end).findIndex((line) => line.startsWith('stamp: '));

  if (at === -1) {
    lines.splice(end, 0, `stamp: ${stamp}`);
  } else {
    lines[at] = `stamp: ${stamp}`;
  }

  return lines.join('\n');
}

export const DOC_CATEGORIES: readonly string[] = ['tutorial', 'how-to', 'reference', 'explanation'];

export function isDocCategory(value: string | undefined): boolean {
  return value !== undefined && DOC_CATEGORIES.includes(value);
}
