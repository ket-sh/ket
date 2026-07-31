import { describe, expect, it } from 'vitest';

import type { StoredItem } from './read-item.ts';

import { renderBoard } from './board.ts';

function stored(key: string, title: string, status: string, parent?: string): StoredItem {
  const link = parent === undefined ? '' : `parent: ${parent}\n`;

  return {
    key,
    contents: `title: ${title}\nkind: feature\nsize: story\nstatus: ${status}\n${link}children: []\n`,
  };
}

describe('the board a repository can read at a glance', () => {
  it('says the project it belongs to', () => {
    expect(renderBoard('SHOP', [])).toContain('# SHOP board');
  });

  it('says so plainly when nothing has been filed', () => {
    expect(renderBoard('SHOP', [])).toContain('No items yet');
  });

  it('names an item under the status it holds', () => {
    const drawn = renderBoard('SHOP', [stored('SHOP-1', 'lock the account', 'implementing')]);

    expect(drawn).toContain('## implementing');
    expect(drawn).toContain('SHOP-1');
    expect(drawn).toContain('lock the account');
  });

  it('groups two items that share a status under one heading', () => {
    const drawn = renderBoard('SHOP', [
      stored('SHOP-1', 'first', 'triaged'),
      stored('SHOP-2', 'second', 'triaged'),
    ]);

    expect(drawn.split('## triaged')).toHaveLength(2);
  });

  it('keeps the statuses in the order the pipeline moves through them', () => {
    const drawn = renderBoard('SHOP', [
      stored('SHOP-1', 'later', 'implementing'),
      stored('SHOP-2', 'earlier', 'triaged'),
    ]);

    expect(drawn.indexOf('## triaged')).toBeLessThan(drawn.indexOf('## implementing'));
  });

  it('writes no heading for a status nothing holds', () => {
    expect(renderBoard('SHOP', [stored('SHOP-1', 'only', 'triaged')])).not.toContain('## shipped');
  });

  it('shows which epic a child belongs to, so the board reads as a tree', () => {
    const drawn = renderBoard('SHOP', [stored('SHOP-2', 'sign in', 'triaged', 'SHOP-1')]);

    expect(drawn).toContain('SHOP-1');
  });

  it('leaves out an item it cannot read, rather than guessing at it', () => {
    const drawn = renderBoard('SHOP', [
      { key: 'SHOP-1', contents: 'nonsense\n' },
      stored('SHOP-2', 'readable', 'triaged'),
    ]);

    expect(drawn).toContain('readable');
    expect(drawn).not.toContain('SHOP-1');
  });

  it('orders items within a status by key, so the board does not shuffle', () => {
    const drawn = renderBoard('SHOP', [
      stored('SHOP-2', 'second', 'triaged'),
      stored('SHOP-1', 'first', 'triaged'),
    ]);

    expect(drawn.indexOf('SHOP-1')).toBeLessThan(drawn.indexOf('SHOP-2'));
  });
});

describe('the shape of the board, line for line', () => {
  it('writes an empty board as a heading and one sentence', () => {
    expect(renderBoard('SHOP', [])).toBe(
      ['# SHOP board', '', 'No items yet. Run /ket:feature to file the first one.', ''].join('\n'),
    );
  });

  it('writes a heading, a blank line, the items, and a blank line after them', () => {
    expect(
      renderBoard('SHOP', [
        stored('SHOP-1', 'add authentication', 'designing'),
        stored('SHOP-2', 'sign in', 'triaged', 'SHOP-1'),
      ]),
    ).toBe(
      [
        '# SHOP board',
        '',
        '## triaged',
        '',
        '- **SHOP-2** sign in `story` (under SHOP-1)',
        '',
        '## designing',
        '',
        '- **SHOP-1** add authentication `story`',
        '',
      ].join('\n'),
    );
  });
});
