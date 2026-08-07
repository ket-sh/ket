import { describe, expect, it } from 'vitest';

import type { PresetIntegration } from './item.ts';

import { categoriesOffering, crowdedCategoriesOf, substitutes } from './category.ts';
import { writes } from './item.ts';

function offers(name: string, category: PresetIntegration['category']): PresetIntegration {
  return {
    name,
    category,
    asks: `${name}, free on a public repository and paid on a private one.`,
    files: [writes(`${name}.yml`, `.github/workflows/${name}.yml`)],
  };
}

const CHROMATIC = offers('chromatic', 'visual review');

const ARGOS = offers('argos', 'visual review');

const CODECOV = offers('codecov', 'coverage');

const CODERABBIT = offers('coderabbit', 'AI pull-request review');

const GREPTILE = offers('greptile', 'AI pull-request review');

const EVERY_CATEGORY = [
  offers('mobbin', 'design reference'),
  offers('chromatic', 'visual review'),
  offers('coderabbit', 'AI pull-request review'),
  offers('codecov', 'coverage'),
  offers('scorecard', 'supply chain'),
  offers('codeql', 'code scanning'),
];

describe('the categories a project is asked about', () => {
  it('asks about design first, and takes several tools for review alone', () => {
    expect(
      categoriesOffering(EVERY_CATEGORY).map((offered) => [offered.category, offered.admits]),
    ).toStrictEqual([
      ['design reference', 'one'],
      ['visual review', 'one'],
      ['AI pull-request review', 'several'],
      ['coverage', 'one'],
      ['supply chain', 'one'],
      ['code scanning', 'one'],
    ]);
  });
});

describe('grouping what a preset offers under the categories it is asked about', () => {
  it('groups the offers of one category together', () => {
    expect(categoriesOffering([CODERABBIT, GREPTILE])).toStrictEqual([
      { category: 'AI pull-request review', admits: 'several', offers: [CODERABBIT, GREPTILE] },
    ]);
  });

  it('asks in the order the categories are declared, not the order a preset offers them', () => {
    expect(
      categoriesOffering([CODECOV, CHROMATIC]).map((offered) => offered.category),
    ).toStrictEqual(['visual review', 'coverage']);
  });

  it('asks about no category the preset offers nothing for', () => {
    expect(categoriesOffering([CODECOV]).map((offered) => offered.category)).toStrictEqual([
      'coverage',
    ]);
  });

  it('asks about nothing when a preset offers nothing', () => {
    expect(categoriesOffering([])).toStrictEqual([]);
  });
});

describe('naming more tools than a category takes', () => {
  it('names the category and every tool named for it', () => {
    expect(crowdedCategoriesOf([CHROMATIC, ARGOS])).toStrictEqual([
      { category: 'visual review', tools: ['chromatic', 'argos'] },
    ]);
  });

  it('names nothing when one tool answers for a category that takes one', () => {
    expect(crowdedCategoriesOf([CHROMATIC])).toStrictEqual([]);
  });

  it('names nothing when two reviewers answer for a category that takes several', () => {
    expect(crowdedCategoriesOf([CODERABBIT, GREPTILE])).toStrictEqual([]);
  });

  it('names nothing when each tool answers for a category of its own', () => {
    expect(crowdedCategoriesOf([CHROMATIC, CODECOV])).toStrictEqual([]);
  });
});

describe('one tool standing in for another', () => {
  it('reads two tools of a category that takes one as substitutes', () => {
    expect(substitutes(CHROMATIC, ARGOS)).toBe(true);
  });

  it('reads two tools of a category that takes several as no substitute', () => {
    expect(substitutes(CODERABBIT, GREPTILE)).toBe(false);
  });

  it('reads two tools of different categories as no substitute', () => {
    expect(substitutes(CHROMATIC, CODECOV)).toBe(false);
  });

  it('reads a tool against itself as no substitute, since nothing stands in for itself', () => {
    expect(substitutes(CHROMATIC, CHROMATIC)).toBe(false);
  });
});
