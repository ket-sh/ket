import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { foldOplog } from './oplog.ts';

const someKeptLine = fc.oneof(
  fc
    .record({
      gate: fc.constantFrom('write', 'probe', 'shell', 'transition', 'lint'),
      outcome: fc.constantFrom('allowed', 'refused', 'skipped'),
      about: fc.string(),
    })
    .map((event) => JSON.stringify(event)),
  fc
    .record({
      note: fc.string(),
      actor: fc.constantFrom('decomposer', 'keeper'),
      item: fc.constantFrom('K-1', 'K-2'),
    })
    .map((event) => JSON.stringify(event)),
);

const someDroppedLine = fc.constantFrom('', 'not json', '{"whatever":1}', '[]');

const someLine = fc.oneof(
  { weight: 3, arbitrary: someKeptLine },
  { weight: 1, arbitrary: someDroppedLine },
);

function keptIn(lines: string[]): string[] {
  return lines.filter((line) => line.includes('"gate"') || line.includes('"note"'));
}

function neverInventsAndWalksBackwards(lines: string[]): void {
  const rows = foldOplog(lines.join('\n'));
  const kept = keptIn(lines);

  expect(rows).toHaveLength(kept.length);

  for (const [seatAt, row] of rows.entries()) {
    const source = kept[kept.length - 1 - seatAt] ?? '';

    expect(row).toStrictEqual({
      outcome: undefined,
      gate: undefined,
      about: undefined,
      item: undefined,
      reason: undefined,
      at: undefined,
      note: undefined,
      actor: undefined,
      ...JSON.parse(source),
    });
  }
}

describe('the invariant the fold keeps', () => {
  it('never invents a row and walks the log newest first, whatever the lines', () => {
    fc.assert(fc.property(fc.array(someLine, { maxLength: 30 }), neverInventsAndWalksBackwards));
  });
});
