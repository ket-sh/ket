import { defineCommand } from 'citty';

import type { ItemStatus } from '../../../shared/item.ts';

import { ITEM_STATUSES } from '../../../shared/item.ts';
import { ketRootOrThrow } from '../../../shared/locate.ts';
import { read } from '../store.ts';
import { departureFrom } from './follow.ts';

function lifecycleStatusOf(given: string): ItemStatus {
  const found = ITEM_STATUSES.find((status) => status === given);

  if (found === undefined) {
    throw new Error(`${given} is not one of ${ITEM_STATUSES.join(', ')}`);
  }

  return found;
}

export const awaitItem = defineCommand({
  meta: { name: 'await', description: 'Block until an item leaves the status it holds' },
  args: {
    key: { type: 'positional', required: true, description: 'The item to wait on' },
    past: { type: 'string', description: 'The status the item must move past' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const item = await read(root, args.key);
    const from = args.past === undefined ? item.status : lifecycleStatusOf(args.past);
    const to = item.status === from ? await departureFrom(root, args.key, from) : item.status;

    process.stdout.write(`${JSON.stringify({ key: args.key, from, to })}\n`);
  },
});
