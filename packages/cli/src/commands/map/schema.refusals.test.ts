import { describe, expect, it } from 'vitest';

import { readMap } from './schema.ts';

const VALID = `version: 1
product:
  name: shop
  idea: one sentence saying what this is and for whom
users:
  - id: u-shopper
    name: shopper
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: a shopper completes one real purchase end to end
    metric: one paid order lands in the ledger
activities:
  - id: a-buy
    name: buy a thing
    steps:
      - id: s-browse
        name: browse the catalog
        stories:
          - id: st-see-products
            name: see what is for sale
            user: u-shopper
            release: r-skeleton
`;

function refusalsOf(source: string): string[] {
  const reading = readMap(source);

  return 'refusals' in reading ? reading.refusals : [];
}

describe('a map the reader cannot make sense of', () => {
  it('names the trouble the parser found in text that is not yaml', () => {
    const refusals = refusalsOf('product:\n  name: shop\n name: again\n');

    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toMatch(/^the map is not yaml: /);
  });

  it('refuses a document that is a bare sentence rather than a mapping', () => {
    expect(refusalsOf('just an idea I had')).toStrictEqual(['the map is not a mapping of keys']);
  });

  it('refuses a version it was never written to read', () => {
    expect(refusalsOf(VALID.replace('version: 1', 'version: 7'))).toStrictEqual([
      'the map is not version 1',
    ]);
  });

  it('names the missing key when the map has no backbone', () => {
    expect(refusalsOf('version: 1\nproduct:\n  name: shop\n  idea: an idea\n')).toStrictEqual([
      'the map carries no activities',
    ]);
  });

  it('names the missing key when the map never says what the product is', () => {
    expect(refusalsOf(VALID.replace('  name: shop\n', ''))).toStrictEqual([
      'the map carries no product name',
    ]);
  });

  it('names the missing key when the product has no idea behind it', () => {
    expect(
      refusalsOf(VALID.replace('  idea: one sentence saying what this is and for whom\n', '')),
    ).toStrictEqual(['the map carries no product idea']);
  });
});

describe('a release the method would not accept', () => {
  it('refuses a release that states no outcome', () => {
    const dropped = VALID.replace(
      '    outcome: a shopper completes one real purchase end to end\n',
      '',
    );

    expect(refusalsOf(dropped)).toStrictEqual(['the release r-skeleton carries no outcome']);
  });

  it('refuses a release that states no metric', () => {
    const dropped = VALID.replace('    metric: one paid order lands in the ledger\n', '');

    expect(refusalsOf(dropped)).toStrictEqual(['the release r-skeleton carries no metric']);
  });

  it('refuses a release whose outcome was left blank', () => {
    const blank = VALID.replace(
      'outcome: a shopper completes one real purchase end to end',
      "outcome: ''",
    );

    expect(refusalsOf(blank)).toStrictEqual(['the release r-skeleton carries no outcome']);
  });

  it('speaks of a release with no id as one release among many', () => {
    expect(refusalsOf(VALID.replace('  - id: r-skeleton\n', '  - \n'))).toStrictEqual([
      'a release carries no id',
    ]);
  });
});

describe('a story the map cannot place', () => {
  it('refuses a story pointing at a release no band declares', () => {
    expect(refusalsOf(VALID.replace('release: r-skeleton', 'release: r-gone'))).toStrictEqual([
      'the story st-see-products points at r-gone, which no release declares',
    ]);
  });

  it('refuses a story naming a user the map never introduced', () => {
    expect(refusalsOf(VALID.replace('user: u-shopper', 'user: u-gone'))).toStrictEqual([
      'the story st-see-products names u-gone, which no user declares',
    ]);
  });

  it('refuses a story whose name is a number rather than a phrase', () => {
    expect(refusalsOf(VALID.replace('name: see what is for sale', 'name: 7'))).toStrictEqual([
      'the story st-see-products carries no name',
    ]);
  });

  it('refuses a story card that was left empty on the page', () => {
    const emptied = VALID.replace(
      `          - id: st-see-products
            name: see what is for sale
            user: u-shopper
            release: r-skeleton
`,
      '          - \n',
    );

    expect(refusalsOf(emptied)).toStrictEqual(['a story carries no id', 'a story carries no name']);
  });
});

describe('a backbone node the map cannot title', () => {
  it('keeps a step refusal even when every story under it reads', () => {
    expect(refusalsOf(VALID.replace('        name: browse the catalog\n', ''))).toStrictEqual([
      'the step s-browse carries no name',
    ]);
  });

  it('keeps the story refusal beside the refusal of the step above it', () => {
    const broken = VALID.replace('        name: browse the catalog\n', '').replace(
      'name: see what is for sale',
      'name: 7',
    );

    expect(refusalsOf(broken)).toStrictEqual([
      'the step s-browse carries no name',
      'the story st-see-products carries no name',
    ]);
  });

  it('names the activity that carries no name of its own', () => {
    expect(refusalsOf(VALID.replace('    name: buy a thing\n', ''))).toStrictEqual([
      'the activity a-buy carries no name',
    ]);
  });
});

describe('an id the map uses twice', () => {
  it('names the id that appears twice across the whole map', () => {
    expect(refusalsOf(VALID.replace('id: s-browse', 'id: a-buy'))).toStrictEqual([
      'the id a-buy appears twice',
    ]);
  });

  it('names each repeated id once, however many times it repeats', () => {
    const tripled = VALID.replace('id: s-browse', 'id: a-buy').replace(
      'id: st-see-products',
      'id: a-buy',
    );

    expect(refusalsOf(tripled)).toStrictEqual(['the id a-buy appears twice']);
  });
});
