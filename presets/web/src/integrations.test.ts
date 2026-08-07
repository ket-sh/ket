import { categoriesOffering } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { WEB_PRESET } from './item.ts';

const FILED = Object.fromEntries(
  categoriesOffering(WEB_PRESET.integrations).map((offered) => [
    offered.category,
    offered.offers.map((offer) => offer.name),
  ]),
);

describe('what a frontend project is asked about, a category at a time', () => {
  it('files each tool it offers under the category that tool answers for', () => {
    expect(FILED).toStrictEqual({
      'design reference': ['mobbin'],
      'visual review': ['chromatic'],
      'AI pull-request review': ['coderabbit', 'greptile'],
      coverage: ['codecov', 'qlty'],
      'supply chain': ['scorecard'],
      'code scanning': ['codeql'],
    });
  });
});
