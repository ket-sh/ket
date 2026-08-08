import { describe, expect, it } from 'vitest';

import { renderItem } from './item.ts';
import { inFlightFrom, parseItem } from './read-item.ts';

const WRITTEN = renderItem({
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  parent: undefined,
  children: [],
});

describe('reading back an item this repository wrote', () => {
  it('recovers every field the gates read', () => {
    expect(parseItem(WRITTEN)).toStrictEqual({
      title: 'login with lockout',
      kind: 'feature',
      size: 'story',
      status: 'implementing',
      parent: undefined,
      children: [],
    });
  });

  it('recovers the children an epic fanned out into', () => {
    const epic = renderItem({
      title: 'authentication',
      kind: 'feature',
      size: 'epic',
      status: 'triaged',
      parent: undefined,
      children: ['AUTH-2', 'AUTH-3'],
    });

    expect(parseItem(epic)?.children).toStrictEqual(['AUTH-2', 'AUTH-3']);
  });

  it('recovers the epic a child broke out of', () => {
    const child = renderItem({
      title: 'lock an account after five failures',
      kind: 'feature',
      size: 'story',
      status: 'triaged',
      parent: 'AUTH-1',
      children: [],
    });

    expect(parseItem(child)?.parent).toBe('AUTH-1');
  });

  it('reads no parent for work that broke out of nothing', () => {
    expect(parseItem(WRITTEN)?.parent).toBeUndefined();
  });

  it('keeps a title that contains a colon, since prose does', () => {
    const written = renderItem({
      title: 'login: with lockout',
      kind: 'feature',
      size: 'story',
      status: 'triaged',
      parent: undefined,
      children: [],
    });

    expect(parseItem(written)?.title).toBe('login: with lockout');
  });
});

describe('reading the description back off an item', () => {
  const described = (description: string): string =>
    renderItem({
      title: 'login with lockout',
      kind: 'feature',
      size: 'story',
      status: 'triaged',
      parent: undefined,
      children: [],
      description,
    });

  it('recovers the prose, blank lines and all', () => {
    expect(parseItem(described('Context\n\nBehavior'))?.description).toBe('Context\n\nBehavior');
  });

  it('reads no description off an item nobody described', () => {
    expect(parseItem(WRITTEN)?.description).toBeUndefined();
  });

  it('reads the status the item holds, not one the description quotes', () => {
    expect(parseItem(described('status: shipped'))?.status).toBe('triaged');
  });

  it('reads no child off a bullet the description happens to carry', () => {
    expect(parseItem(described('Out of scope\n- AUTH-9'))?.children).toStrictEqual([]);
  });

  it('reads no description off a block with nothing under it, since that describes nothing', () => {
    const hollow = 'title: a\nkind: feature\nsize: story\nstatus: triaged\ndescription: |\n';

    expect(parseItem(hollow)?.description).toBeUndefined();
  });
});

describe('an item whose description is not the last thing in the file', () => {
  const WITH_CHILDREN_BELOW = [
    'title: authentication',
    'kind: feature',
    'size: epic',
    'status: triaged',
    'description: |',
    '  Context',
    'children:',
    '  - AUTH-2',
    '',
  ].join('\n');

  it('ends the description where the next field starts', () => {
    expect(parseItem(WITH_CHILDREN_BELOW)?.description).toBe('Context');
  });

  it('reads the fields written below the description, since yaml has no field order', () => {
    expect(parseItem(WITH_CHILDREN_BELOW)?.children).toStrictEqual(['AUTH-2']);
  });

  it('reads the last line of a file that ends without a newline', () => {
    const unterminated =
      'title: a\nkind: bug\nsize: subtask\nstatus: triaged\ndescription: |\n  One line';

    expect(parseItem(unterminated)?.description).toBe('One line');
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
      { key: 'AUTH-1', kind: 'feature', size: 'story', status: 'implementing', children: [] },
    ]);
  });

  it('leaves out an item that shipped', () => {
    const shipped = renderItem({
      title: 'a',
      kind: 'feature',
      size: 'story',
      status: 'shipped',
      parent: undefined,
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
      parent: undefined,
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

describe('an epic that stands for the children it fanned out into', () => {
  it('carries those children through, since a gate decides which item is the job', () => {
    const epic = renderItem({
      title: 'authentication',
      kind: 'feature',
      size: 'epic',
      status: 'designing',
      parent: undefined,
      children: ['AUTH-2', 'AUTH-3'],
    });

    expect(inFlightFrom([{ key: 'AUTH-1', contents: epic }])).toStrictEqual([
      {
        key: 'AUTH-1',
        kind: 'feature',
        size: 'epic',
        status: 'designing',
        children: ['AUTH-2', 'AUTH-3'],
      },
    ]);
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
