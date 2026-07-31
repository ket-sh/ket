import { describe, expect, it } from 'vitest';

import type { Filing } from './decompose.ts';
import type { Item } from './item.ts';

import { decompositionOf } from './decompose.ts';

const EPIC: Item = {
  title: 'authentication',
  kind: 'feature',
  size: 'epic',
  status: 'designing',
  parent: undefined,
  children: [],
};

const FILING: Filing = {
  key: 'AUTH-2',
  title: 'lock an account after five failures',
  kind: 'feature',
  size: 'story',
};

describe('breaking an epic into the work it is made of', () => {
  it('files the child triaged, since it has not been designed yet', () => {
    const outcome = decompositionOf({ key: 'AUTH-1', item: EPIC }, FILING);

    expect(outcome).toStrictEqual({
      parent: { ...EPIC, children: ['AUTH-2'] },
      child: {
        title: 'lock an account after five failures',
        kind: 'feature',
        size: 'story',
        status: 'triaged',
        parent: 'AUTH-1',
        children: [],
      },
    });
  });

  it('adds the child to the ones the epic already fanned out into', () => {
    const outcome = decompositionOf(
      { key: 'AUTH-1', item: { ...EPIC, children: ['AUTH-2'] } },
      { ...FILING, key: 'AUTH-3' },
    );

    expect('parent' in outcome && outcome.parent.children).toStrictEqual(['AUTH-2', 'AUTH-3']);
  });

  it('leaves the status of the epic alone, since a child is not a stage', () => {
    const outcome = decompositionOf(
      { key: 'AUTH-1', item: { ...EPIC, status: 'triaged' } },
      FILING,
    );

    expect('parent' in outcome && outcome.parent.status).toBe('triaged');
  });

  it('lets a child carry a kind of its own, since a chore can serve a feature', () => {
    const outcome = decompositionOf({ key: 'AUTH-1', item: EPIC }, { ...FILING, kind: 'chore' });

    expect('child' in outcome && outcome.child.kind).toBe('chore');
  });
});

describe('breaking a story into the subtasks under it', () => {
  const STORY: Item = { ...EPIC, size: 'story', title: 'login with lockout' };

  it('files a subtask under a story, since a story is not the smallest thing', () => {
    const outcome = decompositionOf({ key: 'AUTH-2', item: STORY }, { ...FILING, size: 'subtask' });

    expect('child' in outcome && outcome.child.parent).toBe('AUTH-2');
  });

  it('files a trivial child under a story, since smaller is what is asked', () => {
    const outcome = decompositionOf({ key: 'AUTH-2', item: STORY }, { ...FILING, size: 'trivial' });

    expect('child' in outcome && outcome.child.size).toBe('trivial');
  });

  it('refuses another story under it, since that decomposes nothing', () => {
    expect(decompositionOf({ key: 'AUTH-2', item: STORY }, FILING)).toStrictEqual({
      refused: 'a child of size story is no smaller than the story AUTH-2',
    });
  });

  it('refuses an epic under it, since a child never outgrows its parent', () => {
    expect(
      decompositionOf({ key: 'AUTH-2', item: STORY }, { ...FILING, size: 'epic' }),
    ).toStrictEqual({ refused: 'a child of size epic is no smaller than the story AUTH-2' });
  });
});

describe('a parent that holds no children at all', () => {
  it('refuses a subtask as a parent, since a subtask is already the work', () => {
    expect(
      decompositionOf(
        { key: 'AUTH-3', item: { ...EPIC, size: 'subtask' } },
        { ...FILING, size: 'trivial' },
      ),
    ).toStrictEqual({
      refused: 'AUTH-3 is sized subtask, and only an epic or a story holds children',
    });
  });

  it('refuses a trivial item as a parent, since nothing is smaller than it', () => {
    expect(
      decompositionOf({ key: 'AUTH-3', item: { ...EPIC, size: 'trivial' } }, FILING),
    ).toStrictEqual({
      refused: 'AUTH-3 is sized trivial, and only an epic or a story holds children',
    });
  });
});

describe('an epic that would take a child no smaller than itself', () => {
  it('refuses another epic, since the pair would never bottom out', () => {
    expect(
      decompositionOf({ key: 'AUTH-1', item: EPIC }, { ...FILING, size: 'epic' }),
    ).toStrictEqual({ refused: 'a child of size epic is no smaller than the epic AUTH-1' });
  });

  it('takes a subtask, since a story is not the only thing an epic contains', () => {
    const outcome = decompositionOf({ key: 'AUTH-1', item: EPIC }, { ...FILING, size: 'subtask' });

    expect('child' in outcome && outcome.child.size).toBe('subtask');
  });
});
