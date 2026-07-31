import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ItemStatus } from './item.ts';
import type { StopAttempt } from './turn-gate.ts';
import type { GovernedItem } from './write-gate.ts';

import { ITEM_KINDS, ITEM_SIZES, ITEM_STATUSES } from './item.ts';
import { standingOf, turnEventFor, turnFor } from './turn-gate.ts';

const IMPLEMENTING: GovernedItem = {
  key: 'OS-1',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  children: [],
};

function stopping(job: GovernedItem): StopAttempt {
  return { job, overridden: false, refusals: 0, rested: false };
}

function at(status: ItemStatus): StopAttempt {
  return stopping({ ...IMPLEMENTING, status });
}

function refusalOf(attempt: StopAttempt): string {
  const turn = turnFor(attempt);

  return 'refused' in turn ? turn.refused : '';
}

const anyJob: fc.Arbitrary<GovernedItem> = fc.record({
  key: fc.constantFrom('OS-1', 'AUTH-12'),
  kind: fc.constantFrom(...ITEM_KINDS),
  size: fc.constantFrom(...ITEM_SIZES),
  status: fc.constantFrom(...ITEM_STATUSES),
  children: fc.constant([]),
});

describe('a stop attempted while the work has somewhere left to go', () => {
  it('names the item, the status it holds and the command that moves it on', () => {
    expect(turnFor(at('implementing'))).toStrictEqual({
      refused:
        'OS-1 is implementing, not at a stopping place. Run ket item verify OS-1, or record a deliberate stop with ket turn rest OS-1 --reason.',
    });
  });

  it('sends verifying work to the mutation gate rather than to a stop', () => {
    expect(refusalOf(at('verifying'))).toContain('Run ket item deliver OS-1');
  });

  it('sends a triaged story to design', () => {
    expect(refusalOf(at('triaged'))).toContain('Run ket item design OS-1');
  });

  it('sends a designing story to submission', () => {
    expect(refusalOf(at('designing'))).toContain('Run ket item submit OS-1');
  });
});

describe('where the pipeline is meant to wait for a person', () => {
  it('lets go while an item waits on approval', () => {
    expect(turnFor(at('awaiting-approval'))).toStrictEqual({
      allowed: 'OS-1 is awaiting-approval, which waits for a person',
    });
  });

  it('lets go while an item waits on its merge', () => {
    expect(turnFor(at('awaiting-merge'))).toStrictEqual({
      allowed: 'OS-1 is awaiting-merge, which waits for a person',
    });
  });

  it('lets go at a triaged subtask, which owes no design and waits on approval', () => {
    const turn = turnFor(stopping({ ...IMPLEMENTING, size: 'subtask', status: 'triaged' }));

    expect(turn).toStrictEqual({ allowed: 'OS-1 is triaged, which waits for a person' });
  });

  it('lets go while an epic is being broken down, since the user picks its children', () => {
    const turn = turnFor(stopping({ ...IMPLEMENTING, size: 'epic', status: 'designing' }));

    expect(turn).toStrictEqual({ allowed: 'OS-1 is designing, which waits for a person' });
  });
});

describe('what makes ket let go of work that is not finished', () => {
  it('lets go once the runtime has overridden the hook, rather than fighting it', () => {
    const turn = turnFor({ ...at('implementing'), overridden: true });

    expect(turn).toStrictEqual({ allowed: 'the runtime had already overridden the stop hook' });
  });

  it('lets go once a person recorded a deliberate stop', () => {
    const turn = turnFor({ ...at('implementing'), rested: true });

    expect(turn).toStrictEqual({
      allowed: 'a person recorded a deliberate stop at this stage',
    });
  });

  it('holds on while the item has been refused fewer times than the bound', () => {
    expect(turnFor({ ...at('implementing'), refusals: 2 })).toHaveProperty('refused');
  });

  it('lets go once it has refused three times and the item has not moved', () => {
    expect(turnFor({ ...at('implementing'), refusals: 3 })).toStrictEqual({
      allowed: 'ket refused this stop 3 times and OS-1 did not move',
    });
  });

  it('lets go past the bound as well, naming what it counted', () => {
    expect(turnFor({ ...at('implementing'), refusals: 4 })).toStrictEqual({
      allowed: 'ket refused this stop 4 times and OS-1 did not move',
    });
  });

  it('answers about the runtime first, since ket has no standing to argue with it', () => {
    const turn = turnFor({ ...at('implementing'), overridden: true, rested: true });

    expect(turn).toStrictEqual({ allowed: 'the runtime had already overridden the stop hook' });
  });
});

describe('what a refusal always carries', () => {
  it('names the item and the status it holds, whatever the stage', () => {
    fc.assert(
      fc.property(anyJob, (job) => {
        const refusal = refusalOf(stopping(job));

        fc.pre(refusal !== '');

        expect(refusal.startsWith(`${job.key} is ${job.status}, `)).toBe(true);
      }),
    );
  });

  it('refuses nothing once something has let ket go, whatever the stage', () => {
    fc.assert(
      fc.property(anyJob, fc.boolean(), fc.boolean(), (job, overridden, rested) => {
        fc.pre(overridden || rested);

        expect('allowed' in turnFor({ ...stopping(job), overridden, rested })).toBe(true);
      }),
    );
  });
});

describe('where a decision about a stop is recorded', () => {
  it('names the item and the stage it stands at, so a later stage counts on its own', () => {
    expect(standingOf(IMPLEMENTING)).toBe('OS-1 implementing');
  });

  it('records a refusal under the stage it was refused at, carrying what it said', () => {
    expect(turnEventFor(IMPLEMENTING, { refused: 'run the next thing' })).toStrictEqual({
      gate: 'turn',
      outcome: 'refused',
      about: 'OS-1 implementing',
      item: 'OS-1',
      reason: 'run the next thing',
    });
  });

  it('records why it let go, since a bound nobody can see is a bound nobody can weigh', () => {
    expect(turnEventFor(IMPLEMENTING, { allowed: 'a person said so' })).toStrictEqual({
      gate: 'turn',
      outcome: 'allowed',
      about: 'OS-1 implementing',
      item: 'OS-1',
      reason: 'a person said so',
    });
  });
});
