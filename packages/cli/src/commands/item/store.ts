import type { Filing } from '../../shared/decompose.ts';

import { decompositionOf } from '../../shared/decompose.ts';
import {
  allocatedIn,
  arriveAlone,
  arrivedAt,
  fileAlone,
  itemsIn,
  keyOf,
  read,
  write,
} from '../../shared/item-store.ts';

export { arriveAlone, fileAlone, itemsIn, keyOf, read, write };

export async function fileUnder(root: string, filing: Filing, parentKey: string): Promise<void> {
  const outcome = decompositionOf({ key: parentKey, item: await read(root, parentKey) }, filing);

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await write(root, filing.key, outcome.child);
  await write(root, parentKey, outcome.parent);
}

export async function arriveUnder(
  root: string,
  filing: Omit<Filing, 'key'>,
  parentKey: string,
): Promise<string> {
  const key = await allocatedIn(root);

  await fileUnder(root, { ...filing, key }, parentKey);
  await arrivedAt(root, key);

  return key;
}
