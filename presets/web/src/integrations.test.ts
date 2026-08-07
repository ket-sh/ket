import type { OfferedCategory } from '@ket/preset';

import { categoriesOffering } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { WEB_PRESET } from './item.ts';

const OFFERED = categoriesOffering(WEB_PRESET.integrations);

function toolsOf(offered: OfferedCategory): string[] {
  return offered.offers.map((offer) => offer.name);
}

describe('what a frontend project is asked about, a concern at a time', () => {
  it('asks about the screen before the pipeline that reviews what the screen became', () => {
    expect(OFFERED.map((offered) => offered.category)).toStrictEqual([
      'design reference',
      'visual review',
      'AI pull-request review',
      'coverage',
      'supply chain',
      'code scanning',
    ]);
  });

  it('takes several reviewers and one of everything else', () => {
    expect(OFFERED.map((offered) => offered.admits)).toStrictEqual([
      'one',
      'one',
      'several',
      'one',
      'one',
      'one',
    ]);
  });

  it('files each tool it offers under the concern that tool answers for', () => {
    expect(OFFERED.map(toolsOf)).toStrictEqual([
      ['mobbin'],
      ['chromatic'],
      ['coderabbit', 'greptile'],
      ['codecov', 'qlty'],
      ['scorecard'],
      ['codeql'],
    ]);
  });
});
