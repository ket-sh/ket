import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { ITEM_STATUSES, isInFlight, nextKey, renderItem, titleRefusal } from './item.ts';

const STORY: Item = {
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'triaged',
  parent: undefined,
  children: [],
};

describe('rendering the item a repository owns', () => {
  it('carries the title a person wrote', () => {
    expect(renderItem(STORY)).toContain('title: login with lockout');
  });

  it('carries the classification the gates read', () => {
    const rendered = renderItem(STORY);

    expect(rendered).toContain('kind: feature');
    expect(rendered).toContain('size: story');
    expect(rendered).toContain('status: triaged');
  });

  it('writes an empty child list rather than omitting it, so the shape never surprises', () => {
    expect(renderItem(STORY)).toContain('children: []');
  });

  it('lists the stories an epic fanned out into', () => {
    const rendered = renderItem({ ...STORY, size: 'epic', children: ['AUTH-2', 'AUTH-3'] });

    expect(rendered).toContain('- AUTH-2');
    expect(rendered).toContain('- AUTH-3');
  });

  it('names the epic a child broke out of', () => {
    expect(renderItem({ ...STORY, parent: 'AUTH-1' })).toContain('parent: AUTH-1');
  });

  it('names no parent for work that broke out of nothing', () => {
    expect(renderItem(STORY)).not.toContain('parent:');
  });

  it('records no time, since git already says when', () => {
    expect(renderItem(STORY)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(renderItem(STORY).endsWith('\n')).toBe(true);
  });
});

describe('allocating the key a new item carries', () => {
  it('starts at one in a repository with no items', () => {
    expect(nextKey('AUTH', [])).toBe('AUTH-1');
  });

  it('takes one above the highest it finds', () => {
    expect(nextKey('AUTH', ['AUTH-1', 'AUTH-2'])).toBe('AUTH-3');
  });

  it('reads the number, not the count, so a deleted item leaves no collision', () => {
    expect(nextKey('AUTH', ['AUTH-7'])).toBe('AUTH-8');
  });

  it('ignores an entry that is not an item of this project', () => {
    expect(nextKey('AUTH', ['.gitkeep', 'README.md', 'OTHER-9'])).toBe('AUTH-1');
  });

  it('reads a number of any length, since a project outlives nine items', () => {
    expect(nextKey('AUTH', ['AUTH-9', 'AUTH-10'])).toBe('AUTH-11');
  });
});

describe('deciding whether an item is in flight', () => {
  it('counts every status between filing and shipping', () => {
    for (const status of [
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
    ]) {
      expect({ status, flight: isInFlight(status) }).toStrictEqual({ status, flight: true });
    }
  });

  it('leaves an idea out, since nobody picked it up', () => {
    expect(isInFlight('idea')).toBe(false);
  });

  it('leaves a shipped item out, since its pull request landed', () => {
    expect(isInFlight('shipped')).toBe(false);
  });

  it('counts an item waiting on a merge, since the work has not landed yet', () => {
    expect(isInFlight('awaiting-merge')).toBe(true);
  });

  it('declares every status the lifecycle names, and no more', () => {
    expect(ITEM_STATUSES).toStrictEqual([
      'idea',
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
      'shipped',
    ]);
  });

  it('waits on a merge after verification and before shipping', () => {
    const order = [...ITEM_STATUSES];

    expect(order.indexOf('awaiting-merge')).toBe(order.indexOf('verifying') + 1);
    expect(order.indexOf('shipped')).toBe(order.indexOf('awaiting-merge') + 1);
  });
});

describe('a status the lifecycle never named', () => {
  it('is not in flight, since the gates only know the eight', () => {
    expect(isInFlight('halfway')).toBe(false);
  });

  it('is not in flight even when it reads like one', () => {
    expect(isInFlight('implementing-ish')).toBe(false);
  });
});

describe('the exact lines an item is written as', () => {
  it('writes one field per line, in the order a reader expects', () => {
    expect(renderItem(STORY).split('\n')).toStrictEqual([
      'title: login with lockout',
      'kind: feature',
      'size: story',
      'status: triaged',
      'children: []',
      '',
    ]);
  });

  it('writes a child list as a yaml sequence under its own key', () => {
    const lines = renderItem({ ...STORY, children: ['AUTH-2', 'AUTH-3'] }).split('\n');

    expect(lines.slice(4)).toStrictEqual(['children:', '  - AUTH-2', '  - AUTH-3', '']);
  });

  it('writes the parent between the status and the children, so the shape reads down', () => {
    expect(renderItem({ ...STORY, parent: 'AUTH-1' }).split('\n')).toStrictEqual([
      'title: login with lockout',
      'kind: feature',
      'size: story',
      'status: triaged',
      'parent: AUTH-1',
      'children: []',
      '',
    ]);
  });
});

describe('an entry that only looks like a key', () => {
  it('ignores a key with no number', () => {
    expect(nextKey('AUTH', ['AUTH-'])).toBe('AUTH-1');
  });

  it('ignores a key whose number is not one', () => {
    expect(nextKey('AUTH', ['AUTH-1a'])).toBe('AUTH-1');
  });

  it('ignores a longer key that starts the same way', () => {
    expect(nextKey('AUTH', ['AUTHZ-9'])).toBe('AUTH-1');
  });
});

describe('an entry belonging to another project', () => {
  it('ignores a key of the same length that is not this one', () => {
    expect(nextKey('AUTH', ['BILL-7'])).toBe('AUTH-1');
  });

  it('counts only this project when both are present', () => {
    expect(nextKey('AUTH', ['BILL-7', 'AUTH-2'])).toBe('AUTH-3');
  });
});

describe('a title that tries to write a field of its own', () => {
  it('refuses a title carrying a newline, since the file would then hold two statuses', () => {
    expect(titleRefusal('authentication\nstatus: implementing')).toBe(
      'a title is one line, and this one carries a line break',
    );
  });

  it('refuses a title carrying a carriage return, which yaml reads as a line break too', () => {
    expect(titleRefusal('authentication\rstatus: implementing')).toBe(
      'a title is one line, and this one carries a line break',
    );
  });

  it('accepts a title that stays on one line', () => {
    expect(titleRefusal('lock the account after three failed logins')).toBeUndefined();
  });

  it('refuses a title with nothing in it, since an item nobody can name is not an item', () => {
    expect(titleRefusal('')).toBe('a title says what the work is, and this one is empty');
  });

  it('refuses a title that is only spaces', () => {
    expect(titleRefusal('   ')).toBe('a title says what the work is, and this one is empty');
  });

  it('accepts a title that merely mentions a field name', () => {
    expect(titleRefusal('record the status of a login attempt')).toBeUndefined();
  });
});
