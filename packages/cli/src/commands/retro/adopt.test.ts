import type { GateSemantics } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import type { RetroAction } from './fold.ts';
import type { RetroWindow } from './window.ts';

import { chosenDraft } from './adopt.ts';
import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

const TEST_FIRST = 'the test comes first';

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({
    gate,
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason,
  })}\n`;
}

const CROWDED =
  turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
  turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST) +
  turnedAway('review', '2026-08-04T11:00:00.000Z', 'the design names no spec');

function draftedActions(log: string, gates: GateSemantics[] = []): RetroAction[] {
  return foldRetro(WORKING, log, WINDOW, gates).actions;
}

function adoption(gate: string, item: string, reason?: string): string {
  return `${JSON.stringify({
    adopted: gate,
    ...(reason === undefined ? {} : { reason }),
    item,
    at: '2026-08-05T09:00:00.000Z',
  })}\n`;
}

describe('choosing a draft to adopt by its number', () => {
  it('hands over the action the asked number names', () => {
    const actions = draftedActions(CROWDED);

    expect(chosenDraft('', actions, '1')).toStrictEqual({ action: actions[0] });
    expect(chosenDraft('', actions, '2')).toStrictEqual({ action: actions[1] });
  });

  it('refuses an unknown number by naming the range the report printed', () => {
    expect(chosenDraft('', draftedActions(CROWDED), '9')).toStrictEqual({
      refused: 'draft 9 is not one this retro drafted, and the drafts run 1 to 2',
    });
  });

  it('refuses a number nothing can count the same way', () => {
    expect(chosenDraft('', draftedActions(CROWDED), 'first')).toStrictEqual({
      refused: 'draft first is not one this retro drafted, and the drafts run 1 to 2',
    });
  });

  it('refuses zero, since the report numbers from one', () => {
    expect(chosenDraft('', draftedActions(CROWDED), '0')).toStrictEqual({
      refused: 'draft 0 is not one this retro drafted, and the drafts run 1 to 2',
    });
  });

  it('refuses outright when the window drafted nothing', () => {
    expect(chosenDraft('', [], '1')).toStrictEqual({
      refused: 'this window drafted nothing, so there is nothing to adopt',
    });
  });
});

describe('adopting a draft an earlier adoption already filed', () => {
  it('refuses by naming the item the first adoption filed', () => {
    const log = CROWDED + adoption('write', 'KET-9', TEST_FIRST);

    expect(chosenDraft(log, draftedActions(log), '1')).toStrictEqual({
      refused: 'draft 1 already became KET-9, so adopting it again would file the same work twice',
    });
  });

  it('leaves another draft adoptable, since only one was filed', () => {
    const log = CROWDED + adoption('write', 'KET-9', TEST_FIRST);
    const actions = draftedActions(log);

    expect(chosenDraft(log, actions, '2')).toStrictEqual({ action: actions[1] });
  });

  it('blocks nothing when the earlier adoption named the gate for another reason', () => {
    const log = CROWDED + adoption('write', 'KET-9', 'a tool owns the lockfile');
    const actions = draftedActions(log);

    expect(chosenDraft(log, actions, '1')).toStrictEqual({ action: actions[0] });
  });

  it('blocks nothing when the earlier adoption named another gate for the same reason', () => {
    const log = CROWDED + adoption('review', 'KET-9', TEST_FIRST);
    const actions = draftedActions(log);

    expect(chosenDraft(log, actions, '1')).toStrictEqual({ action: actions[0] });
  });
});

describe('adopting the dormant draft twice', () => {
  const DUP: GateSemantics = {
    script: 'lint:dup',
    guards: 'It finds knowledge written twice.',
    commitJob: 'lint:dup',
    ciJob: 'check',
  };

  const BUSY = `${JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: 'triaged',
    item: 'K-1',
    at: '2026-08-04T09:00:00.000Z',
  })}\n`;

  it('refuses by naming the item, matching on the gate alone', () => {
    const log = BUSY + adoption('lint:dup', 'KET-3');

    expect(chosenDraft(log, draftedActions(log, [DUP]), '1')).toStrictEqual({
      refused: 'draft 1 already became KET-3, so adopting it again would file the same work twice',
    });
  });

  it('ignores an adoption that carried a reason, since the dormant draft has none', () => {
    const log = BUSY + adoption('lint:dup', 'KET-3', 'some cluster reason');
    const actions = draftedActions(log, [DUP]);

    expect(chosenDraft(log, actions, '1')).toStrictEqual({ action: actions[0] });
  });
});
