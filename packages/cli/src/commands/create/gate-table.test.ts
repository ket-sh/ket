import type { GateSemantics } from '@ket/preset-cli';

import { describe, expect, it } from 'vitest';

import { gateTable } from './gate-table.ts';

const ARMED: GateSemantics = {
  script: 'lint',
  guards: 'It checks style and correctness.',
  commitJob: 'lint',
};

const ON_DEMAND: GateSemantics = {
  script: 'test:mutation',
  guards: 'It checks that the suite asserts.',
  commitJob: '',
};

const ANSI = /\[\d+m/gu;

function bare(line: string): string {
  return line.replaceAll(ANSI, '');
}

function linesOf(gates: GateSemantics[]): string[] {
  return gateTable(gates).split('\n').map(bare);
}

function rowsOf(gates: GateSemantics[]): string[] {
  return linesOf(gates).filter((line) => line.includes('bun run '));
}

describe('laying the gate chain out as a table', () => {
  it('gives every gate a row of its own', () => {
    expect(rowsOf([ARMED, ON_DEMAND])).toHaveLength(2);
  });

  it('spells out the command a reader can paste', () => {
    expect(rowsOf([ARMED])[0]).toContain('bun run lint');
  });

  it('says what the command does, beside the command', () => {
    expect(rowsOf([ARMED])[0]).toContain('It checks style and correctness.');
  });

  it('marks a gate the commit hook runs with a machine, since nobody types it', () => {
    expect(rowsOf([ARMED])[0]).toContain('⚙');
  });

  it('marks a gate the reader runs with a play mark, since they press it', () => {
    expect(rowsOf([ON_DEMAND])[0]).toContain('▷');
  });

  it('lines the descriptions up, however long the commands are', () => {
    const [short, long] = rowsOf([ARMED, ON_DEMAND]);

    expect(short?.indexOf('It checks style and correctness.')).toBe(
      long?.indexOf('It checks that the suite asserts.'),
    );
  });
});

describe('the frame the gate table sits in', () => {
  it('opens with a rounded corner at either end of the top', () => {
    const top = linesOf([ARMED])[0]?.trim() ?? '';

    expect({ opens: top.startsWith('╭'), closes: top.endsWith('╮') }).toStrictEqual({
      opens: true,
      closes: true,
    });
  });

  it('closes with a rounded corner at either end of the bottom', () => {
    const bottom = linesOf([ARMED]).at(-1)?.trim() ?? '';

    expect({ opens: bottom.startsWith('╰'), closes: bottom.endsWith('╯') }).toStrictEqual({
      opens: true,
      closes: true,
    });
  });

  it('names what each column holds, above the rows', () => {
    const heading = linesOf([ARMED])[1] ?? '';

    expect(heading).toContain('run');
    expect(heading).toContain('what it does');
  });

  it('gives the marker column no heading, since the footer reads the marks', () => {
    const cells = (linesOf([ARMED])[1] ?? '').split('│');

    expect(cells[1]?.trim()).toBe('');
  });

  it('indents every line, so the table sits inside the closing screen', () => {
    for (const line of linesOf([ARMED, ON_DEMAND])) {
      expect({ line, indented: line.startsWith('   ') && line.charAt(3) !== ' ' }).toStrictEqual({
        line,
        indented: true,
      });
    }
  });

  it('draws no rule between gate rows, since ten of them would read as a fence', () => {
    const drawn = linesOf([ARMED, ON_DEMAND]);
    const [first, second] = rowsOf([ARMED, ON_DEMAND]);

    expect(drawn.indexOf(second ?? '') - drawn.indexOf(first ?? '')).toBe(1);
  });
});

describe('the footer that reads the marks', () => {
  it('says what each mark means, inside the frame', () => {
    const footer = linesOf([ARMED]).at(-2) ?? '';

    expect(footer).toContain('⚙');
    expect(footer).toContain('▷');
    expect(footer).toContain('commit');
  });

  it('sets the two marks apart, so the legend does not read as one phrase', () => {
    expect(linesOf([ARMED]).at(-2)).toContain('runs it   ▷');
  });

  it('spans the whole table, rather than sitting in one column', () => {
    const footer = linesOf([ARMED]).at(-2) ?? '';

    expect(footer.split('│')).toHaveLength(3);
  });

  it('sits below a rule, so it reads apart from the gates', () => {
    const rule = linesOf([ARMED]).at(-3)?.trim() ?? '';

    expect({ opens: rule.startsWith('├'), closes: rule.endsWith('┤') }).toStrictEqual({
      opens: true,
      closes: true,
    });
  });

  it('closes the columns at that rule, since nothing below them is divided', () => {
    const rule = linesOf([ARMED]).at(-3) ?? '';

    expect({ closes: rule.includes('┴'), divides: rule.includes('┬') }).toStrictEqual({
      closes: true,
      divides: false,
    });
  });
});

describe('what the table must not leave behind', () => {
  it('drops the half rule the spanning row opens, rather than drawing two', () => {
    const drawn = linesOf([ARMED, ON_DEMAND]);
    const rules = drawn.filter((line) => line.includes('┴'));

    expect(rules).toHaveLength(1);
  });

  it('keeps every line the same width, so the frame closes square', () => {
    const drawn = linesOf([ARMED, ON_DEMAND]);
    const widths = new Set(drawn.map((line) => line.length));

    expect(widths.size).toBe(1);
  });
});

describe('the rule under the heading', () => {
  it('separates the heading from the first gate', () => {
    const drawn = linesOf([ARMED, ON_DEMAND]);

    expect(drawn[2]?.trim().startsWith('├')).toBe(true);
    expect(drawn[3]).toContain('bun run lint');
  });

  it('keeps the columns divided, since rows carry on below it', () => {
    const rule = linesOf([ARMED])[2] ?? '';

    expect({ divides: rule.includes('┼'), closes: rule.includes('┴') }).toStrictEqual({
      divides: true,
      closes: false,
    });
  });

  it('draws exactly two rules, one under the heading and one above the footer', () => {
    const rules = linesOf([ARMED, ON_DEMAND]).filter((line) => line.trim().startsWith('├'));

    expect(rules).toHaveLength(2);
  });
});
