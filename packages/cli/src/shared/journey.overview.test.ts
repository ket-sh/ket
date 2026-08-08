import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

const WRITTEN = [
  'title: The watched item',
  'kind: feature',
  'size: story',
  'status: designing',
  'children: []',
  'description: |',
  '  The keeper locks the account after five failures.',
  '',
].join('\n');

const BARE =
  'title: The watched item\nkind: feature\nsize: story\nstatus: designing\nchildren: []\n';

describe('the description a journey carries to its overview', () => {
  it('carries the description the item was written with', () => {
    const journey = foldJourney([{ key: 'K-1', contents: WRITTEN }], '', 'K-1');

    expect(journey?.description).toBe('The keeper locks the account after five failures.');
  });

  it('carries nothing for an item nobody has described', () => {
    const journey = foldJourney([{ key: 'K-1', contents: BARE }], '', 'K-1');

    expect(journey?.description).toBeUndefined();
  });
});
