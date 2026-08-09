import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

function itemOf(status: string): string {
  return [
    'title: The watched item',
    'kind: bug',
    'size: story',
    `status: ${status}`,
    'children: []',
    '',
  ].join('\n');
}

function moved(to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item: 'K-1', at })}\n`;
}

function wrote(path: string, at: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'allowed', about: path, item: 'K-1', at })}\n`;
}

const WALKED =
  moved('triaged', '2026-08-07T09:00:00.000Z') + moved('designing', '2026-08-07T10:00:00.000Z');

function stepsAt(
  stored: string,
  log: string,
  id: string,
): { name: string; at: string | undefined }[] | undefined {
  return foldJourney([{ key: 'K-1', contents: stored }], log, 'K-1')?.nodes.find(
    (node) => node.id === id,
  )?.steps;
}

describe('the sub-steps a stage wears on the canvas', () => {
  it('attaches an artifact written during the stage to that stage', () => {
    const log = WALKED + wrote('.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z');

    expect(stepsAt(itemOf('designing'), log, 'designing')).toStrictEqual([
      { name: 'spec.md', at: '2026-08-07T10:30:00.000Z' },
    ]);
    expect(stepsAt(itemOf('designing'), log, 'triaged')).toStrictEqual([]);
  });

  it('splits the writes between two visits by their own windows', () => {
    const log =
      WALKED +
      wrote('.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z') +
      moved('awaiting-approval', '2026-08-07T11:00:00.000Z') +
      moved('designing', '2026-08-07T12:00:00.000Z') +
      wrote('.ket/items/K-1/adr.md', '2026-08-07T12:30:00.000Z');

    expect(stepsAt(itemOf('designing'), log, 'designing')).toStrictEqual([
      { name: 'spec.md', at: '2026-08-07T10:30:00.000Z' },
    ]);
    expect(stepsAt(itemOf('designing'), log, 'designing#2')).toStrictEqual([
      { name: 'adr.md', at: '2026-08-07T12:30:00.000Z' },
    ]);
  });

  it('names a rewritten artifact once, wearing its last write', () => {
    const log =
      WALKED +
      wrote('.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z') +
      wrote('.ket/items/K-1/spec.md', '2026-08-07T10:40:00.000Z');

    expect(stepsAt(itemOf('designing'), log, 'designing')).toStrictEqual([
      { name: 'spec.md', at: '2026-08-07T10:40:00.000Z' },
    ]);
  });

  it('leaves the writes of other items and other gates off the stage', () => {
    const log =
      WALKED +
      `${JSON.stringify({ gate: 'write', outcome: 'refused', about: '.ket/items/K-1/spec.md', item: 'K-1', at: '2026-08-07T10:30:00.000Z' })}\n` +
      wrote('src/auth.ts', '2026-08-07T10:31:00.000Z');

    expect(stepsAt(itemOf('designing'), log, 'designing')).toStrictEqual([]);
  });

  it('gives a stage the machine has never reached no steps', () => {
    expect(stepsAt(itemOf('designing'), WALKED, 'awaiting-approval')).toStrictEqual([]);
  });

  it('folds every write onto the only stage when the log holds no move', () => {
    const log = wrote('.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z');

    expect(stepsAt(itemOf('designing'), log, 'designing')).toStrictEqual([
      { name: 'spec.md', at: '2026-08-07T10:30:00.000Z' },
    ]);
  });
});
