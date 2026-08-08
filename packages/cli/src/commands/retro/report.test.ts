import { describe, expect, it } from 'vitest';

import type { Retro } from './fold.ts';

import { renderRetro } from './report.ts';

const EMPTY: Retro = {
  window: {
    from: Date.parse('2026-08-03T00:00:00.000Z'),
    to: Date.parse('2026-08-08T12:00:00.000Z'),
  },
  events: 0,
  entered: [],
  shipped: [],
  inFlight: [],
  unmoved: [],
  clusters: [],
  stall: undefined,
  rework: [],
  waiting: 0,
  working: 0,
  actions: [],
};

const HOUR = 3_600_000;

const DAY = 24 * HOUR;

function reportOf(over: Partial<Retro>): string {
  return renderRetro({ ...EMPTY, ...over });
}

const FOLD = { key: 'K-1', title: 'The fold', size: 'story' };

const TEST_FIRST = 'no failing test covers this edit';

const REFUSED_AT = '2026-08-04T09:00:00.000Z';

const CLUSTER = {
  gate: 'write',
  reason: TEST_FIRST,
  count: 7,
  moments: [Date.parse(REFUSED_AT)],
  items: ['K-1'],
};

const FULL: Retro = {
  ...EMPTY,
  events: 42,
  entered: [FOLD],
  shipped: [{ key: 'K-2', title: 'A quiet fix', size: 'subtask' }],
  inFlight: [{ ...FOLD, status: 'implementing', age: 2 * DAY + 4 * HOUR }],
  unmoved: [{ key: 'K-3', title: 'Rename the ring', size: 'subtask' }],
  clusters: [CLUSTER],
  stall: { key: 'K-1', stage: 'implementing', span: 3 * HOUR + 30 * 60_000 },
  rework: [{ key: 'K-1', count: 2 }],
  waiting: 2 * HOUR,
  working: 45 * 60_000,
  actions: [
    {
      cluster: CLUSTER,
      draft: {
        number: 1,
        sentence: `\`write\` refused 7 times: ${TEST_FIRST}; run \`ket gate write\` where the work starts`,
        evidence: { gate: 'write', reason: TEST_FIRST, moments: [REFUSED_AT], items: ['K-1'] },
      },
    },
  ],
};

const WRITTEN = [
  '# Retro for `2026-W32`',
  '',
  '## The week in items',
  '',
  '### Entered',
  '',
  '- `K-1` The fold (story)',
  '',
  '### Shipped',
  '',
  '- `K-2` A quiet fix (subtask)',
  '',
  '### Still in flight',
  '',
  '- `K-1` The fold (story), at implementing, 2d 4h old',
  '',
  '## What slowed you',
  '',
  '### Refusals by gate and reason',
  '',
  `- \`write\` refused 7 times: ${TEST_FIRST}`,
  '',
  '### The longest stall',
  '',
  '`K-1` sat at implementing for 3h 30m.',
  '',
  '### Rework loops',
  '',
  '- `K-1` went backward 2 times',
  '',
  '### Where the time went',
  '',
  'Waiting on a person: 2h 0m. Machine working: 45m.',
  '',
  '## Items that entered and never moved',
  '',
  '- `K-3` Rename the ring (subtask)',
  '',
  '## The one action',
  '',
  `\`write\` refused 7 times, each for the same reason: ${TEST_FIRST}. Consider a mechanical check, \`ket gate write\` run where the work starts, so the rule stops the edit before the edit lands.`,
  '',
  `Draft 1: \`write\` refused 7 times: ${TEST_FIRST}; run \`ket gate write\` where the work starts. Adopt it with \`ket retro adopt 1\`.`,
  '',
  '## Coverage',
  '',
  'The window runs from 2026-08-03T00:00:00.000Z to 2026-08-08T12:00:00.000Z, over 42 events.',
  '',
].join('\n');

describe('the report a full week writes', () => {
  it('writes every section in order, each spaced as markdown reads it', () => {
    expect(renderRetro(FULL)).toBe(WRITTEN);
  });
});

describe('the report a retro writes', () => {
  it('titles the report with the week the window closes in', () => {
    expect(reportOf({}).split('\n')[0]).toBe('# Retro for `2026-W32`');
  });

  it('closes by naming the window and what it covered', () => {
    expect(reportOf({ events: 42 })).toContain(
      '## Coverage\n\nThe window runs from 2026-08-03T00:00:00.000Z to 2026-08-08T12:00:00.000Z, over 42 events.\n',
    );
  });

  it('counts a single event as one, so the closing line reads as English', () => {
    expect(reportOf({ events: 1 })).toContain(', over 1 event.');
  });

  it('ends on a newline, so the file reads as a file', () => {
    expect(reportOf({}).endsWith('events.\n')).toBe(true);
  });
});

describe('the report an empty window writes', () => {
  it('writes the title and the coverage, and nothing besides', () => {
    expect(reportOf({})).toBe(
      [
        '# Retro for `2026-W32`',
        '',
        '## Coverage',
        '',
        'The window runs from 2026-08-03T00:00:00.000Z to 2026-08-08T12:00:00.000Z, over 0 events.',
        '',
      ].join('\n'),
    );
  });

  it('lists no items at all', () => {
    expect(reportOf({})).not.toContain('- ');
  });

  it('asks for no action, since nothing was refused', () => {
    expect(reportOf({})).not.toContain('## The one action');
  });

  it('hides the week in items, since no item moved', () => {
    expect(reportOf({})).not.toContain('## The week in items');
  });

  it('hides what slowed you, since nothing did', () => {
    expect(reportOf({})).not.toContain('## What slowed you');
  });
});

describe('the items a report lists', () => {
  it('names an entered item with its title and its size, under both headings', () => {
    expect(reportOf({ entered: [FOLD] })).toContain(
      '## The week in items\n\n### Entered\n\n- `K-1` The fold (story)\n',
    );
  });

  it('names an item the store lost by its key alone', () => {
    const lost = { key: 'GONE-9', title: undefined, size: undefined };

    expect(reportOf({ entered: [lost] })).toContain('- `GONE-9`\n');
  });

  it('names a shipped item under its own heading', () => {
    expect(reportOf({ shipped: [FOLD] })).toContain('### Shipped\n\n- `K-1` The fold (story)');
  });

  it('hides the entered heading when nothing entered', () => {
    expect(reportOf({ shipped: [FOLD] })).not.toContain('### Entered');
  });

  it('names an item that entered and never moved', () => {
    expect(reportOf({ unmoved: [FOLD] })).toContain(
      '## Items that entered and never moved\n\n- `K-1` The fold (story)',
    );
  });
});

describe('the items a report shows still in flight', () => {
  function flying(age: number | undefined): string {
    return reportOf({ inFlight: [{ ...FOLD, status: 'implementing', age }] });
  }

  it('names the stage an item stands at and how long it has run', () => {
    expect(flying(2 * DAY + 4 * HOUR)).toContain(
      '### Still in flight\n\n- `K-1` The fold (story), at implementing, 2d 4h old\n',
    );
  });

  it('names the stage alone when the log never saw the item filed', () => {
    expect(flying(undefined)).toContain('- `K-1` The fold (story), at implementing\n');
  });

  it('reads a span under a day in hours and minutes', () => {
    expect(flying(3 * HOUR + 30 * 60_000)).toContain(', 3h 30m old');
  });

  it('reads a span under an hour in minutes', () => {
    expect(flying(45 * 60_000)).toContain(', 45m old');
  });

  it('drops the minutes once a span runs into days', () => {
    expect(flying(2 * DAY + 4 * HOUR + 30 * 60_000)).toContain(', 2d 4h old');
  });
});
