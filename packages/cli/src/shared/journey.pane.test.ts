import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

interface Manifest {
  status: string;
  parent?: string;
  children?: string[];
}

function itemOf({ status, parent, children = [] }: Manifest): string {
  const kin =
    children.length === 0
      ? 'children: []'
      : ['children:', ...children.map((child) => `  - ${child}`)].join('\n');

  return [
    'title: The watched item',
    'kind: bug',
    'size: story',
    `status: ${status}`,
    ...(parent === undefined ? [] : [`parent: ${parent}`]),
    kin,
    '',
  ].join('\n');
}

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function turnedAway(item: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'refused', about: 'a path', item, at, reason })}\n`;
}

const STORED = [{ key: 'K-1', contents: itemOf({ status: 'designing' }) }];

const WALKED =
  moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
  moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

describe('the identity the side pane reads off an item', () => {
  it('carries the kind and the size the manifest declares', () => {
    const pane = foldJourney(STORED, '', 'K-1')?.pane;

    expect(pane?.kind).toBe('bug');
    expect(pane?.size).toBe('story');
  });

  it('carries the status the item stands in', () => {
    expect(foldJourney(STORED, '', 'K-1')?.pane.status).toBe('designing');
  });

  it('numbers the standing stage against the whole machine path', () => {
    const pane = foldJourney(STORED, WALKED, 'K-1')?.pane;

    expect(pane?.stageAt).toBe(3);
    expect(pane?.stageOf).toBe(8);
  });
});

describe('the alert the side pane raises', () => {
  it('counts no refusals for an item nothing has turned away', () => {
    expect(foldJourney(STORED, WALKED, 'K-1')?.pane.refusedTimes).toBe(0);
  });

  it('counts every refusal since the item arrived in its standing stage', () => {
    const log =
      WALKED +
      turnedAway('K-1', '2026-08-07T10:10:00.000Z', 'no test covers it') +
      turnedAway('K-1', '2026-08-07T10:20:00.000Z', 'still no test covers it');

    expect(foldJourney(STORED, log, 'K-1')?.pane.refusedTimes).toBe(2);
  });

  it('counts a refusal recorded at the very moment the item arrived', () => {
    const log = WALKED + turnedAway('K-1', '2026-08-07T10:00:00.000Z', 'refused on arrival');

    expect(foldJourney(STORED, log, 'K-1')?.pane.refusedTimes).toBe(1);
  });

  it('leaves a refusal from a stage the item has already left out of the count', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
      turnedAway('K-1', '2026-08-07T09:30:00.000Z', 'an older complaint') +
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

    expect(foldJourney(STORED, log, 'K-1')?.pane.refusedTimes).toBe(0);
  });
});

describe('the moments the side pane dates', () => {
  it('dates the arrival that opened the standing stage', () => {
    expect(foldJourney(STORED, WALKED, 'K-1')?.pane.arrivedAt).toBe('2026-08-07T10:00:00.000Z');
  });

  it('dates the arrival by the newest move when several stand behind it', () => {
    const log =
      WALKED +
      moved('K-1', 'awaiting-approval', '2026-08-07T11:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-07T12:00:00.000Z');

    expect(foldJourney(STORED, log, 'K-1')?.pane.arrivedAt).toBe('2026-08-07T12:00:00.000Z');
  });

  it('dates the last event the item recorded, whatever gate wrote it', () => {
    const log = WALKED + turnedAway('K-1', '2026-08-07T11:00:00.000Z', 'no test covers it');

    expect(foldJourney(STORED, log, 'K-1')?.pane.lastEventAt).toBe('2026-08-07T11:00:00.000Z');
  });

  it('dates nothing for an item the log has never mentioned', () => {
    const pane = foldJourney(STORED, '', 'K-1')?.pane;

    expect(pane?.arrivedAt).toBeUndefined();
    expect(pane?.lastEventAt).toBeUndefined();
  });
});

describe('the family the side pane names', () => {
  it('names no parent for an item filed on its own', () => {
    expect(foldJourney(STORED, '', 'K-1')?.pane.parent).toBeUndefined();
  });

  it('names the parent the manifest points at', () => {
    const stored = [{ key: 'K-1', contents: itemOf({ status: 'designing', parent: 'K-9' }) }];

    expect(foldJourney(stored, '', 'K-1')?.pane.parent).toBe('K-9');
  });
});

describe('the gates the side pane offers', () => {
  it('offers approve while the design awaits its approval', () => {
    const stored = [{ key: 'K-1', contents: itemOf({ status: 'awaiting-approval' }) }];

    expect(foldJourney(stored, '', 'K-1')?.pane.offers).toStrictEqual(['approve']);
  });

  it('offers ship and reopen while the merge awaits its confirmation', () => {
    const stored = [{ key: 'K-1', contents: itemOf({ status: 'awaiting-merge' }) }];

    expect(foldJourney(stored, '', 'K-1')?.pane.offers).toStrictEqual(['ship', 'reopen']);
  });

  it('offers nothing while the machine still runs the stage', () => {
    expect(foldJourney(STORED, '', 'K-1')?.pane.offers).toStrictEqual([]);
  });
});

describe('the repository facts the side pane borrows', () => {
  it('borrows nothing when the repository answers nothing', () => {
    const pane = foldJourney(STORED, '', 'K-1')?.pane;

    expect(pane?.filed).toBeUndefined();
    expect(pane?.branch).toBeUndefined();
  });

  it('carries who filed the item and when the repository first saw it', () => {
    const filed = { by: 'Ada Lovelace', at: '2026-08-07T08:00:00.000Z' };
    const pane = foldJourney(STORED, '', 'K-1', { filed, branch: undefined })?.pane;

    expect(pane?.filed).toStrictEqual(filed);
  });

  it('carries the branch the work sits on and how many commits it holds', () => {
    const branch = { name: 'feat/watched', commits: 4 };
    const pane = foldJourney(STORED, '', 'K-1', { filed: undefined, branch })?.pane;

    expect(pane?.branch).toStrictEqual(branch);
  });
});
