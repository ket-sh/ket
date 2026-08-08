import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceDoc } from '../../shared/journey.ts';

import { foldJourney } from '../../shared/journey.ts';
import { docsFor } from './docs.ts';

let itemDir = '';

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-ledger-'));
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

function eventOf(over: object): string {
  return `${JSON.stringify({ item: 'K-1', ...over })}\n`;
}

function storedAt(status: string): { key: string; contents: string }[] {
  return [
    {
      key: 'K-1',
      contents: `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\nchildren: []\n`,
    },
  ];
}

const LOG =
  eventOf({
    gate: 'transition',
    outcome: 'allowed',
    about: 'triaged',
    at: '2026-08-07T08:00:00.000Z',
  }) +
  eventOf({
    gate: 'transition',
    outcome: 'allowed',
    about: 'designing',
    at: '2026-08-07T09:00:00.000Z',
  }) +
  eventOf({
    gate: 'write',
    outcome: 'allowed',
    about: '.ket/items/K-1/spec.md',
    at: '2026-08-07T09:10:00.000Z',
  }) +
  eventOf({
    gate: 'probe',
    outcome: 'allowed',
    about: 'checks',
    reason: '',
    at: '2026-08-07T09:15:00.000Z',
  }) +
  eventOf({
    gate: 'write',
    outcome: 'refused',
    about: 'src/auth.ts',
    reason: 'no failing test covers it',
    at: '2026-08-07T09:30:00.000Z',
  });

async function ledgerOf(
  title: string,
  stored = storedAt('designing'),
  log = LOG,
): Promise<SurfaceDoc | undefined> {
  const journey = foldJourney(stored, log, 'K-1');

  if (journey === undefined) {
    throw new Error('the fixture journey never folded');
  }

  const grown = await docsFor(itemDir, log, journey);

  return grown.nodes.find((node) => node.title === title)?.doc;
}

describe('the window a stage ledger keeps', () => {
  it('lists exactly the arrival for a stage the journey left at once', async () => {
    expect(await ledgerOf('triaged')).toStrictEqual({
      kind: 'ledger',
      label: 'Ledger',
      lines: [
        {
          at: '2026-08-07T08:00:00.000Z',
          text: 'transition · allowed · triaged',
          refused: false,
        },
      ],
    });
  });

  it('opens the window on the arrival itself and speaks each event plainly', async () => {
    const doc = await ledgerOf('designing');
    const lines = doc?.kind === 'ledger' ? doc.lines : [];

    expect(lines[0]).toStrictEqual({
      at: '2026-08-07T09:00:00.000Z',
      text: 'transition · allowed · designing',
      refused: false,
    });
    expect(lines).toContainEqual({
      at: '2026-08-07T09:10:00.000Z',
      text: 'write · allowed · .ket/items/K-1/spec.md',
      refused: false,
    });
    expect(lines).toContainEqual({
      at: '2026-08-07T09:15:00.000Z',
      text: 'probe · allowed · checks',
      refused: false,
    });
    expect(lines).toContainEqual({
      at: '2026-08-07T09:30:00.000Z',
      text: 'write · refused · src/auth.ts · no failing test covers it',
      refused: true,
    });
  });
});

const SHIPPED_LOG =
  eventOf({
    gate: 'transition',
    outcome: 'allowed',
    about: 'triaged',
    at: '2026-08-07T08:00:00.000Z',
  }) +
  eventOf({
    gate: 'transition',
    outcome: 'allowed',
    about: 'shipped',
    at: '2026-08-07T09:00:00.000Z',
  }) +
  eventOf({
    gate: 'write',
    outcome: 'allowed',
    about: '.ket/items/K-1/spec.md',
    at: '2026-08-07T09:10:00.000Z',
  }) +
  eventOf({
    gate: 'shell',
    outcome: 'refused',
    about: 'rm -rf',
    reason: 'never',
    at: '2026-08-07T09:30:00.000Z',
  });

describe('the notes a ledger speaks', () => {
  it('speaks a note as its author and its words', async () => {
    const log =
      LOG +
      eventOf({
        note: 'researching the breakdown',
        actor: 'decomposer',
        at: '2026-08-07T09:40:00.000Z',
      });
    const doc = await ledgerOf('designing', storedAt('designing'), log);
    const lines = doc?.kind === 'ledger' ? doc.lines : [];

    expect(lines).toContainEqual({
      at: '2026-08-07T09:40:00.000Z',
      text: 'note · decomposer · researching the breakdown',
      refused: false,
    });
  });
});

describe('the ledgers a stage goes without or keeps open', () => {
  it('leaves a pending stage without a ledger', async () => {
    expect(await ledgerOf('awaiting-approval')).toBeUndefined();
  });

  it('keeps the window open past a later artifact when no stage follows', async () => {
    const doc = await ledgerOf('shipped', storedAt('shipped'), SHIPPED_LOG);
    const lines = doc?.kind === 'ledger' ? doc.lines : [];

    expect(lines.some((line) => line.text.includes('rm -rf'))).toBe(true);
  });
});
