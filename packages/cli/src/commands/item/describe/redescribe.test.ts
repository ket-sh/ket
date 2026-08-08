import { describe, expect, it } from 'vitest';

import type { Item } from '../../../shared/item.ts';

import { redescribing } from './redescribe.ts';

const epic: Item = {
  title: 'Sign-in survives a lockout',
  kind: 'feature',
  size: 'epic',
  status: 'designing',
  parent: undefined,
  children: ['K-2', 'K-3'],
};

const RATIONALE = 'Slice rationale\n\nThe form comes first, the lockout notice second.';

describe('rewriting the description a filed item carries', () => {
  it('fills the description of an item filed without one', () => {
    expect(redescribing(epic, RATIONALE)).toStrictEqual({
      described: { ...epic, description: RATIONALE },
    });
  });

  it('replaces the placeholder the filing wrote, keeping every other field', () => {
    expect(
      redescribing({ ...epic, description: 'unknown: where the cut falls' }, RATIONALE),
    ).toStrictEqual({ described: { ...epic, description: RATIONALE } });
  });

  it('refuses prose with nothing in it, so an empty pipe never wipes what the item says', () => {
    expect(redescribing({ ...epic, description: RATIONALE }, '')).toStrictEqual({
      refused: 'the prose is empty, and a description says what the work is',
    });
  });

  it('refuses prose that is only blank lines, since that says nothing either', () => {
    expect(redescribing(epic, '\n  \n')).toStrictEqual({
      refused: 'the prose is empty, and a description says what the work is',
    });
  });
});
