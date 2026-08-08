import type { Item } from '../../../shared/item.ts';

export type Redescription = { described: Item } | { refused: string };

export function redescribing(item: Item, prose: string): Redescription {
  if (prose.trim() === '') {
    return { refused: 'the prose is empty, and a description says what the work is' };
  }

  return { described: { ...item, description: prose } };
}
