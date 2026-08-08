const OPENING = 'description: |';

const INDENT = '  ';

const BREAK = /\r\n|\r|\n/u;

export interface ItemParts {
  fields: string;
  description: string | undefined;
}

function withoutTrailingBlanks(lines: string[]): string[] {
  return lines.slice(0, lines.findLastIndex((line) => line.trim() !== '') + 1);
}

function linesOf(description: string | undefined): string[] {
  return description === undefined ? [] : description.split(BREAK);
}

function indented(line: string): string {
  return line === '' ? '' : `${INDENT}${line}`;
}

export function renderDescription(description: string | undefined): string[] {
  const lines = withoutTrailingBlanks(linesOf(description));

  return lines.length === 0 ? [] : [OPENING, ...lines.map(indented)];
}

function withoutIndent(line: string): string {
  return line.startsWith(INDENT) ? line.slice(INDENT.length) : line;
}

function endOfBlock(lines: string[]): number {
  const beyond = lines.findIndex((line) => line !== '' && !line.startsWith(INDENT));

  return beyond === -1 ? lines.length : beyond;
}

export function splitDescription(contents: string): ItemParts {
  const lines = contents.split('\n');
  const opening = lines.indexOf(OPENING);

  if (opening === -1) {
    return { fields: contents, description: undefined };
  }

  const below = lines.slice(opening + 1);
  const end = endOfBlock(below);
  const block = withoutTrailingBlanks(below.slice(0, end));

  return {
    fields: [...lines.slice(0, opening), ...below.slice(end)].join('\n'),
    description: block.length === 0 ? undefined : block.map(withoutIndent).join('\n'),
  };
}

export function describing(description: string | undefined): { description?: string } {
  return description === undefined ? {} : { description };
}
