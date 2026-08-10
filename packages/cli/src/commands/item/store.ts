import type { Filing } from '../../shared/decompose.ts';

import { decompositionOf } from '../../shared/decompose.ts';
import { describing } from '../../shared/item-description.ts';
import { itemsIn, keyOf, read, write } from '../../shared/item-store.ts';
import { promotedFrom } from '../../shared/item.ts';

export { itemsIn, keyOf, read, write };

export async function fileAlone(root: string, filing: Filing): Promise<void> {
  await write(root, filing.key, {
    title: filing.title,
    kind: filing.kind,
    size: filing.size,
    status: 'triaged',
    parent: undefined,
    children: [],
    ...promotedFrom(filing.story),
    ...describing(filing.description),
  });
}

export async function fileUnder(root: string, filing: Filing, parentKey: string): Promise<void> {
  const outcome = decompositionOf({ key: parentKey, item: await read(root, parentKey) }, filing);

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await write(root, filing.key, outcome.child);
  await write(root, parentKey, outcome.parent);
}
