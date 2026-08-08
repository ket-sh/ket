import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Item } from '../../../shared/item.ts';

import {
  ITEM_KINDS,
  ITEM_SIZES,
  ITEM_STATUSES,
  renderItem,
  titleRefusal,
} from '../../../shared/item.ts';
import { parseItem } from '../../../shared/read-item.ts';
import { redescribing } from './redescribe.ts';

const anyKey = fc.integer({ min: 1, max: 9999 }).map((at) => `K-${String(at)}`);

const anyItem: fc.Arbitrary<Item> = fc.record({
  title: fc.string(),
  kind: fc.constantFrom(...ITEM_KINDS),
  size: fc.constantFrom(...ITEM_SIZES),
  status: fc.constantFrom(...ITEM_STATUSES),
  parent: fc.option(anyKey, { nil: undefined }),
  children: fc.array(anyKey),
});

const anyProse = fc
  .tuple(
    fc.array(fc.string(), { maxLength: 4 }),
    fc.string().filter((line) => line.trim() !== ''),
  )
  .map(([above, last]) => [...above, last].join('\n'));

const anyForgedProse = fc
  .tuple(fc.constantFrom(...ITEM_STATUSES), anyKey, anyProse)
  .map(([forged, stranger, prose]) => `status: ${forged}\n- ${stranger}\n${prose}`);

const anyBlank = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 8 })
  .map((blanks) => blanks.join(''));

function readBack(item: Item, prose: string): Item | undefined {
  const outcome = redescribing(item, prose);

  if (!('described' in outcome)) {
    throw new Error(outcome.refused);
  }

  return parseItem(renderItem(outcome.described));
}

describe('what prose filed after the item can and cannot change', () => {
  it('never lets a later description decide the status, the children or the parent', () => {
    fc.assert(
      fc.property(anyItem, anyForgedProse, (item, prose) => {
        fc.pre(titleRefusal(item.title) === undefined);

        const stored = readBack(item, prose);

        expect({
          status: stored?.status,
          children: stored?.children,
          parent: stored?.parent,
        }).toStrictEqual({ status: item.status, children: item.children, parent: item.parent });
      }),
    );
  });

  it('stores the prose it accepted as the description the reader opens later', () => {
    fc.assert(
      fc.property(anyItem, anyProse, (item, prose) => {
        fc.pre(titleRefusal(item.title) === undefined);

        expect(readBack(item, prose)?.description).toBe(prose);
      }),
    );
  });

  it('refuses prose that carries no words, whatever whitespace it arrives as', () => {
    fc.assert(
      fc.property(anyItem, anyBlank, (item, blank) => {
        expect(redescribing(item, blank)).toStrictEqual({
          refused: 'the prose is empty, and a description says what the work is',
        });
      }),
    );
  });
});
