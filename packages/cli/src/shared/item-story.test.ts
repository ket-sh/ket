import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { renderItem } from './item.ts';
import { filedStoriesFrom, parseItem } from './read-item.ts';

const STORY: Item = {
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'triaged',
  parent: undefined,
  children: [],
};

const PROMOTED: Item = { ...STORY, story: 'st-see' };

describe('the story on the map an item was promoted from', () => {
  it('names the story the work came from', () => {
    expect(renderItem(PROMOTED)).toContain('story: st-see');
  });

  it('names no story for work nobody promoted off the map', () => {
    expect(renderItem(STORY)).not.toContain('story:');
  });

  it('writes the story between the parent and the children, so the shape reads down', () => {
    expect(renderItem({ ...PROMOTED, parent: 'AUTH-1' }).split('\n')).toStrictEqual([
      'title: login with lockout',
      'kind: feature',
      'size: story',
      'status: triaged',
      'parent: AUTH-1',
      'story: st-see',
      'children: []',
      '',
    ]);
  });

  it('recovers the story off an item this repository wrote', () => {
    expect(parseItem(renderItem(PROMOTED))?.story).toBe('st-see');
  });

  it('reads no story off an item filed before the map named one', () => {
    expect(parseItem(renderItem(STORY))?.story).toBeUndefined();
  });

  it('reads an item filed before the map named one as an item all the same', () => {
    expect(parseItem(renderItem(STORY))).toStrictEqual(STORY);
  });
});

describe('the stories the filed items already claim', () => {
  it('collects the story each item was promoted from', () => {
    const stored = [
      { key: 'K-1', contents: renderItem(PROMOTED) },
      { key: 'K-2', contents: renderItem({ ...STORY, story: 'st-card' }) },
    ];

    expect(filedStoriesFrom(stored)).toStrictEqual(['st-see', 'st-card']);
  });

  it('claims nothing for an item nobody promoted off the map', () => {
    expect(filedStoriesFrom([{ key: 'K-1', contents: renderItem(STORY) }])).toStrictEqual([]);
  });

  it('claims nothing off a file this repository cannot read as an item', () => {
    expect(filedStoriesFrom([{ key: 'K-1', contents: 'story: st-see\n' }])).toStrictEqual([]);
  });

  it('claims the story of a shipped item too, since the work still exists', () => {
    const shipped = renderItem({ ...PROMOTED, status: 'shipped' });

    expect(filedStoriesFrom([{ key: 'K-1', contents: shipped }])).toStrictEqual(['st-see']);
  });
});
