import { describe, expect, it } from 'vitest';

import { describePlan } from './report.ts';

describe('reporting what init found', () => {
  it('names the repository and the key it derived', () => {
    const lines = describePlan({ root: '/work/order-service', key: 'OS' });

    expect(lines).toStrictEqual(['repository  /work/order-service', 'project key OS']);
  });

  it('says the key still needs choosing when none could be derived', () => {
    const lines = describePlan({ root: '/work/2026', key: undefined });

    expect(lines).toStrictEqual([
      'repository  /work/2026',
      'project key none derived from the directory name, so init will ask',
    ]);
  });
});
