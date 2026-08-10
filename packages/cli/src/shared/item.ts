import { renderDescription } from './item-description.ts';

export const ITEM_STATUSES = [
  'idea',
  'triaged',
  'designing',
  'awaiting-approval',
  'implementing',
  'verifying',
  'awaiting-merge',
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
  story?: string;
  description?: string;
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

const FILED: ItemStatus = 'triaged';

export function isWorking(status: string): boolean {
  return isInFlight(status) && status !== FILED;
}

function renderChildren(children: string[]): string {
  if (children.length === 0) {
    return 'children: []';
  }

  return ['children:', ...children.map((child) => `  - ${child}`)].join('\n');
}

function renderField(field: string, value: string | undefined): string[] {
  return value === undefined ? [] : [`${field}: ${value}`];
}

export function promotedFrom(story: string | undefined): { story?: string } {
  return story === undefined ? {} : { story };
}

export function renderItem(item: Item): string {
  return [
    `title: ${item.title}`,
    `kind: ${item.kind}`,
    `size: ${item.size}`,
    `status: ${item.status}`,
    ...renderField('parent', item.parent),
    ...renderField('story', item.story),
    renderChildren(item.children),
    ...renderDescription(item.description),
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
