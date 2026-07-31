import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Decomposition } from './decompose.ts';
import type { ItemSize } from './item.ts';

import { decompositionOf } from './decompose.ts';
import { ITEM_KINDS, ITEM_SIZES, ITEM_STATUSES } from './item.ts';

const key = fc.stringMatching(/^[A-Z]{2,5}-[1-9][0-9]{0,3}$/);

const item = fc.record({
  title: fc.string(),
  kind: fc.constantFrom(...ITEM_KINDS),
  size: fc.constantFrom(...ITEM_SIZES),
  status: fc.constantFrom(...ITEM_STATUSES),
  parent: fc.option(key, { nil: undefined }),
  children: fc.array(key, { maxLength: 4 }),
});

const decomposing = fc.record({
  parent: fc.record({ key, item }),
  filing: fc.record({
    key,
    title: fc.string(),
    kind: fc.constantFrom(...ITEM_KINDS),
    size: fc.constantFrom(...ITEM_SIZES),
  }),
});

type Decomposing = ReturnType<(typeof decomposing)['generate']>['value'];

function outcomeOf(given: Decomposing): Decomposition {
  return decompositionOf(given.parent, given.filing);
}

function isSmaller(child: ItemSize, parent: ItemSize): boolean {
  return ITEM_SIZES.indexOf(child) > ITEM_SIZES.indexOf(parent);
}

describe('decomposing an item, over arbitrary parents and children', () => {
  it('never accepts a child that is not strictly smaller than its parent', () => {
    fc.assert(
      fc.property(decomposing, (given) => {
        const outcome = outcomeOf(given);

        if ('child' in outcome) {
          expect(isSmaller(outcome.child.size, given.parent.item.size)).toBe(true);
        }
      }),
    );
  });

  it('records the link on both ends whenever it accepts one', () => {
    fc.assert(
      fc.property(decomposing, (given) => {
        const outcome = outcomeOf(given);

        if ('child' in outcome) {
          expect({
            listed: outcome.parent.children.includes(given.filing.key),
            names: outcome.child.parent,
          }).toStrictEqual({ listed: true, names: given.parent.key });
        }
      }),
    );
  });

  it('leaves the children an item already had in place when it takes another', () => {
    fc.assert(
      fc.property(decomposing, (given) => {
        const outcome = outcomeOf(given);

        if ('parent' in outcome) {
          expect(outcome.parent.children.slice(0, -1)).toStrictEqual(given.parent.item.children);
        }
      }),
    );
  });

  it('refuses every child of an item that holds no children at all', () => {
    fc.assert(
      fc.property(decomposing, (given) => {
        const size = given.parent.item.size;

        if (size !== 'epic' && size !== 'story') {
          expect(outcomeOf(given)).toStrictEqual({
            refused: `${given.parent.key} is sized ${size}, and only an epic or a story holds children`,
          });
        }
      }),
    );
  });
});
