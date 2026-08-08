import { describe, expect, it } from 'vitest';

import { foldKanban } from './kanban.ts';

function itemOf(status: string, parent?: string): string {
  return [
    'title: A queued thing',
    'kind: feature',
    'size: story',
    `status: ${status}`,
    ...(parent === undefined ? [] : [`parent: ${parent}`]),
    'children: []',
    '',
  ].join('\n');
}

function cardFor(stored: { key: string; contents: string }[], key: string) {
  return foldKanban(stored, '')
    .flatMap((column) => column.cards)
    .find((card) => card.key === key);
}

describe('the epic a card hangs under', () => {
  it('names the parent the manifest points at', () => {
    const stored = [{ key: 'K-2', contents: itemOf('triaged', 'K-1') }];

    expect(cardFor(stored, 'K-2')?.parent).toBe('K-1');
  });

  it('names no parent for a card filed on its own', () => {
    const stored = [{ key: 'K-1', contents: itemOf('triaged') }];

    expect(cardFor(stored, 'K-1')?.parent).toBeUndefined();
  });
});
