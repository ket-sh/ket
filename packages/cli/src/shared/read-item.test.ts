import { describe, expect, it } from 'vitest';

import { renderItem } from './item.ts';
import { inFlightFrom, parseItem } from './read-item.ts';

const WRITTEN = renderItem({
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  children: [],
});

describe('reading back an item this repository wrote', () => {
  it('recovers every field the gates read', () => {
    expect(parseItem(WRITTEN)).toStrictEqual({
      title: 'login with lockout',
      kind: 'feature',
      size: 'story',
      status: 'implementing',
      children: [],
    });
  });

  it('recovers the children an epic fanned out into', () => {
    const epic = renderItem({
      title: 'authentication',
      kind: 'feature',
      size: 'epic',
      status: 'triaged',
      children: ['AUTH-2', 'AUTH-3'],
    });

    expect(parseItem(epic)?.children).toStrictEqual(['AUTH-2', 'AUTH-3']);
  });

  it('keeps a title that contains a colon, since prose does', () => {
    const written = renderItem({
      title: 'login: with lockout',
      kind: 'feature',
      size: 'story',
      status: 'triaged',
      children: [],
    });

    expect(parseItem(written)?.title).toBe('login: with lockout');
  });
});

describe('refusing to guess at an item it cannot read', () => {
  it('reads nothing from an empty file', () => {
    expect(parseItem('')).toBeUndefined();
  });

  it('reads nothing when a field the gates need is missing', () => {
    expect(parseItem('title: a\nkind: feature\nsize: story\n')).toBeUndefined();
  });

  it('reads nothing when the status is not one the lifecycle names', () => {
    expect(
      parseItem('title: a\nkind: feature\nsize: story\nstatus: halfway\nchildren: []\n'),
    ).toBeUndefined();
  });

  it('reads nothing when the kind is not one the pipeline names', () => {
    expect(
      parseItem('title: a\nkind: poem\nsize: story\nstatus: triaged\nchildren: []\n'),
    ).toBeUndefined();
  });

  it('reads nothing when the size is not one the matrix names', () => {
    expect(
      parseItem('title: a\nkind: feature\nsize: huge\nstatus: triaged\nchildren: []\n'),
    ).toBeUndefined();
  });
});

describe('collecting what is in flight', () => {
  it('keeps an item the pipeline is working on', () => {
    expect(inFlightFrom([{ key: 'AUTH-1', contents: WRITTEN }])).toStrictEqual([
      { key: 'AUTH-1', kind: 'feature', size: 'story', status: 'implementing' },
    ]);
  });

  it('leaves out an item that shipped', () => {
    const shipped = renderItem({
      title: 'a',
      kind: 'feature',
      size: 'story',
      status: 'shipped',
      children: [],
    });

    expect(inFlightFrom([{ key: 'AUTH-1', contents: shipped }])).toStrictEqual([]);
  });

  it('leaves out an idea nobody picked up', () => {
    const idea = renderItem({
      title: 'a',
      kind: 'feature',
      size: 'story',
      status: 'idea',
      children: [],
    });

    expect(inFlightFrom([{ key: 'AUTH-1', contents: idea }])).toStrictEqual([]);
  });

  it('keeps every item it can read, in the order it was given them', () => {
    const flight = inFlightFrom([
      { key: 'AUTH-2', contents: WRITTEN },
      { key: 'AUTH-1', contents: WRITTEN },
    ]);

    expect(flight.map((item) => item.key)).toStrictEqual(['AUTH-2', 'AUTH-1']);
  });

  it('leaves out an item it cannot read rather than guessing at it', () => {
    expect(inFlightFrom([{ key: 'AUTH-1', contents: 'nonsense' }])).toStrictEqual([]);
  });
});

describe('a line that is not a field cannot become one', () => {
  it('reads nothing from a line that only starts like a field', () => {
    expect(
      parseItem('titleX\nkind: feature\nsize: story\nstatus: triaged\nchildren: []\n'),
    ).toBeUndefined();
  });

  it('reads nothing from a field name with no value beside it', () => {
    expect(
      parseItem('title\nkind: feature\nsize: story\nstatus: triaged\nchildren: []\n'),
    ).toBeUndefined();
  });

  it('reads nothing when only the title is missing', () => {
    expect(
      parseItem('kind: feature\nsize: story\nstatus: implementing\nchildren: []\n'),
    ).toBeUndefined();
  });

  it('ignores a key the item shape does not name', () => {
    const written = 'title: a\nowner: nobody\nkind: feature\nsize: story\nstatus: triaged\n';

    expect(parseItem(written)?.title).toBe('a');
  });
});
