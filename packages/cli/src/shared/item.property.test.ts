import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { ITEM_KINDS, ITEM_SIZES, ITEM_STATUSES, renderItem, titleRefusal } from './item.ts';
import { parseItem } from './read-item.ts';

const anyKey = fc
  .tuple(fc.stringMatching(/^[A-Z]{2,5}$/u), fc.integer({ min: 1, max: 9999 }))
  .map(([prefix, at]) => `${prefix}-${at}`);

const anyItem: fc.Arbitrary<Item> = fc
  .record({
    title: fc.string(),
    kind: fc.constantFrom(...ITEM_KINDS),
    size: fc.constantFrom(...ITEM_SIZES),
    status: fc.constantFrom(...ITEM_STATUSES),
    parent: fc.option(anyKey, { nil: undefined }),
    children: fc.array(anyKey),
  })
  .map((fields) => ({ ...fields }));

describe('what a written item reads back as', () => {
  it('reads back as itself whenever the title was one a filing accepts', () => {
    fc.assert(
      fc.property(anyItem, (item) => {
        fc.pre(titleRefusal(item.title) === undefined);

        expect(parseItem(renderItem(item))).toStrictEqual(item);
      }),
    );
  });

  it('never lets a title decide the status', () => {
    fc.assert(
      fc.property(anyItem, fc.constantFrom(...ITEM_STATUSES), (item, forged) => {
        fc.pre(titleRefusal(item.title) === undefined);

        const written = renderItem({ ...item, title: `${item.title} status: ${forged}` });

        expect(parseItem(written)?.status).toBe(item.status);
      }),
    );
  });
});
