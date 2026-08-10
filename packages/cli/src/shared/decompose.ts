import type { Item, ItemKind, ItemSize } from './item.ts';

import { describing } from './item-description.ts';
import { ITEM_SIZES, promotedFrom } from './item.ts';

export interface Parent {
  key: string;
  item: Item;
}

export interface Filing {
  key: string;
  title: string;
  kind: ItemKind;
  size: ItemSize;
  story?: string;
  description?: string;
}

export type Decomposition = { parent: Item; child: Item } | { refused: string };

const DECOMPOSABLE: ItemSize[] = ['epic', 'story'];

function magnitudeOf(size: ItemSize): number {
  return ITEM_SIZES.indexOf(size);
}

function whyNot(parent: Parent, filing: Filing): string | undefined {
  if (!DECOMPOSABLE.some((size) => size === parent.item.size)) {
    return `${parent.key} is sized ${parent.item.size}, and only an epic or a story holds children`;
  }

  if (magnitudeOf(filing.size) <= magnitudeOf(parent.item.size)) {
    return `a child of size ${filing.size} is no smaller than the ${parent.item.size} ${parent.key}`;
  }

  return undefined;
}

export function decompositionOf(parent: Parent, filing: Filing): Decomposition {
  const refused = whyNot(parent, filing);

  if (refused !== undefined) {
    return { refused };
  }

  return {
    parent: { ...parent.item, children: [...parent.item.children, filing.key] },
    child: {
      title: filing.title,
      kind: filing.kind,
      size: filing.size,
      status: 'triaged',
      parent: parent.key,
      children: [],
      ...promotedFrom(filing.story),
      ...describing(filing.description),
    },
  };
}
