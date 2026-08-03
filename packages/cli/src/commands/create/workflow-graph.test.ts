import { describe, expect, it } from 'vitest';

import { graphLines, paintedGraphLines, WORKFLOW_GRAPH } from './workflow-graph.ts';

const ESCAPE = String.fromCharCode(27);

const ANSI_CODE = new RegExp(`${ESCAPE}\\[[\\d;]+m`, 'gu');

const TORII_RED = `${ESCAPE}[38;2;216;72;39m`;

const CLOSES = `${ESCAPE}[39m`;

const TRADITIONAL_TERMINAL = 80;

function bare(line: string): string {
  return line.replaceAll(ANSI_CODE, '');
}

describe('the drawing the workflow question shows', () => {
  it('opens on the command that files a piece of work', () => {
    expect(WORKFLOW_GRAPH).toContain('/ket:feature');
  });

  it('names every seat the design stage fans out to', () => {
    expect(WORKFLOW_GRAPH).toContain('adr');
    expect(WORKFLOW_GRAPH).toContain('solution');
    expect(WORKFLOW_GRAPH).toContain('gherkin');
    expect(WORKFLOW_GRAPH).toContain('ui design');
  });

  it('names the stages the fan-out joins back into', () => {
    expect(WORKFLOW_GRAPH).toContain('approve');
    expect(WORKFLOW_GRAPH).toContain('build');
    expect(WORKFLOW_GRAPH).toContain('review');
    expect(WORKFLOW_GRAPH).toContain('ship');
  });

  it('marks the two places the pipeline waits for a person, and only those two', () => {
    expect(WORKFLOW_GRAPH.split('⛩')).toHaveLength(3);
  });

  it('says whose turn it is at each of those two places', () => {
    expect(WORKFLOW_GRAPH.split('(you)')).toHaveLength(3);
  });

  it('carries no trailing space, since a painted line would hide the drift', () => {
    for (const line of graphLines(WORKFLOW_GRAPH)) {
      expect(line).toBe(line.trimEnd());
    }
  });

  it('fits a traditional terminal, so it never wraps into nonsense', () => {
    for (const line of graphLines(WORKFLOW_GRAPH)) {
      expect({ line, fits: line.length <= TRADITIONAL_TERMINAL }).toStrictEqual({
        line,
        fits: true,
      });
    }
  });
});

describe('breaking the drawing into the rows a terminal prints', () => {
  it('gives one row for every line the drawing holds', () => {
    expect(graphLines('first\nsecond\nthird')).toStrictEqual(['first', 'second', 'third']);
  });

  it('gives a single row for a drawing that never breaks', () => {
    expect(graphLines('alone')).toStrictEqual(['alone']);
  });

  it('draws the whole approved graph, row for row', () => {
    expect(graphLines(WORKFLOW_GRAPH)).toHaveLength(17);
  });
});

describe('painting the human gates in the red the torii wears', () => {
  it('paints a gate box from its opening wall to its closing wall', () => {
    expect(paintedGraphLines('║   approve   ║')).toStrictEqual([
      `${TORII_RED}║   approve   ║${CLOSES}`,
    ]);
  });

  it('leaves the graph around a gate unpainted, so only the gate glows', () => {
    expect(paintedGraphLines('──▶║   approve   ║')).toStrictEqual([
      `──▶${TORII_RED}║   approve   ║${CLOSES}`,
    ]);
  });

  it('paints a roof that carries the torii between its corners', () => {
    expect(paintedGraphLines('╔═══ ⛩ ═══════╗')).toStrictEqual([
      `${TORII_RED}╔═══ ⛩ ═══════╗${CLOSES}`,
    ]);
  });

  it('paints a floor past the junction the arrow leaves through', () => {
    expect(paintedGraphLines('╚══════╦══════╝')).toStrictEqual([
      `${TORII_RED}╚══════╦══════╝${CLOSES}`,
    ]);
  });

  it('paints a gate whose walls sit against each other with nothing between', () => {
    expect(paintedGraphLines('║║')).toStrictEqual([`${TORII_RED}║║${CLOSES}`]);
  });

  it('paints two gates on one row apart, rather than swallowing the graph between them', () => {
    expect(paintedGraphLines('║ a ║ and ║ b ║')).toStrictEqual([
      `${TORII_RED}║ a ║${CLOSES} and ${TORII_RED}║ b ║${CLOSES}`,
    ]);
  });

  it('leaves a row that holds no gate exactly as it was drawn', () => {
    expect(paintedGraphLines('┌─────┐')).toStrictEqual(['┌─────┐']);
  });
});

describe('painting the approved drawing rather than an arbitrary one', () => {
  it('paints one row for every row the drawing holds', () => {
    expect(paintedGraphLines(WORKFLOW_GRAPH)).toHaveLength(graphLines(WORKFLOW_GRAPH).length);
  });

  it('changes nothing but color, so the drawing survives the paint', () => {
    expect(paintedGraphLines(WORKFLOW_GRAPH).map(bare)).toStrictEqual(graphLines(WORKFLOW_GRAPH));
  });

  it('closes the color after every gate it opened, so the red never leaks', () => {
    for (const row of paintedGraphLines(WORKFLOW_GRAPH)) {
      expect({ row, opened: row.split(TORII_RED).length }).toStrictEqual({
        row,
        opened: row.split(CLOSES).length,
      });
    }
  });

  it('paints the gates on exactly the rows the drawing puts them on', () => {
    const rows = paintedGraphLines(WORKFLOW_GRAPH)
      .map((row, index) => (row.includes(TORII_RED) ? index : -1))
      .filter((index) => index !== -1);

    expect(rows).toStrictEqual([3, 4, 5, 6, 13, 14, 15, 16]);
  });
});
