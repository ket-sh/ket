export const ITEM_STATUSES = [
  'idea',
  'triaged',
  'designing',
  'awaiting-approval',
  'implementing',
  'verifying',
  'shipped',
] as const;

export const ITEM_KINDS = ['feature', 'bug', 'refactor', 'chore'] as const;

export const ITEM_SIZES = ['epic', 'story', 'subtask', 'trivial'] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type ItemKind = (typeof ITEM_KINDS)[number];

export type ItemSize = (typeof ITEM_SIZES)[number];

export interface Item {
  title: string;
  kind: ItemKind;
  size: ItemSize;
  status: ItemStatus;
  parent: string | undefined;
  children: string[];
}

const SETTLED: ItemStatus[] = ['idea', 'shipped'];

const BREAKS = ['\n', '\r'];

// A field is written one per line, so a title carrying a break writes a second
// field. A forged status above the real one is what the reader then finds.
export function titleRefusal(title: string): string | undefined {
  if (title.trim() === '') {
    return 'a title says what the work is, and this one is empty';
  }

  return BREAKS.some((brk) => title.includes(brk))
    ? 'a title is one line, and this one carries a line break'
    : undefined;
}

export function isInFlight(status: string): boolean {
  return (
    ITEM_STATUSES.some((known) => known === status) && !SETTLED.some((rest) => rest === status)
  );
}

function renderChildren(children: string[]): string {
  if (children.length === 0) {
    return 'children: []';
  }

  return ['children:', ...children.map((child) => `  - ${child}`)].join('\n');
}

function renderParent(parent: string | undefined): string[] {
  return parent === undefined ? [] : [`parent: ${parent}`];
}

export function renderItem(item: Item): string {
  return [
    `title: ${item.title}`,
    `kind: ${item.kind}`,
    `size: ${item.size}`,
    `status: ${item.status}`,
    ...renderParent(item.parent),
    renderChildren(item.children),
    '',
  ].join('\n');
}

const DIGITS = '0123456789';

function isDigitsOnly(text: string): boolean {
  return Array.from(text).every((digit) => DIGITS.includes(digit));
}

function numberOf(entry: string, key: string): number {
  const prefix = `${key}-`;

  if (!entry.startsWith(prefix)) {
    return 0;
  }

  const digits = entry.slice(prefix.length);

  return isDigitsOnly(digits) ? Number(digits) : 0;
}

export function nextKey(key: string, entries: string[]): string {
  const highest = entries.reduce((found, entry) => Math.max(found, numberOf(entry, key)), 0);

  return `${key}-${String(highest + 1)}`;
}
