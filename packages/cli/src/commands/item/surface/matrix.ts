import type { Panel } from './panel.ts';
import type { Part } from './reading.ts';

import { panelOf } from './panel.ts';
import { splitOnHeading } from './reading.ts';
import { escaped } from './text.ts';

interface MatrixCell {
  glyph: string;
  name: string;
}

interface MatrixRow {
  option: string;
  chosen: boolean;
  cells: MatrixCell[];
}

interface Matrix {
  drivers: string[];
  rows: MatrixRow[];
}

const GLYPHS = new Map<string, string>([
  ['++', 'strong-yes'],
  ['+', 'yes'],
  ['0', 'even'],
  ['-', 'no'],
  ['--', 'strong-no'],
  ['X', 'out'],
  ['?', 'unknown'],
]);

const OPTION_OPENER = 'Option:';

const VERDICTS_OPENER = 'Verdicts:';

const LEGEND = `<p class="matrix-legend"><span><code>++</code> strongly meets</span><span><code>+</code> meets</span><span><code>0</code> neutral</span><span><code>-</code> misses</span><span><code>--</code> strongly misses</span><span><code>X</code> ruled out</span><span><code>?</code> unknown</span></p>
<p class="matrix-note">No column is summed and no row is scored. The matrix shows the reading, the decision stays in the prose.</p>`;

function opensMatrixLine(line: string): boolean {
  const trimmed = line.trim();

  return trimmed.startsWith(OPTION_OPENER) || trimmed.startsWith(VERDICTS_OPENER);
}

export function withoutMatrixLines(source: string): string {
  return source
    .split('\n')
    .filter((line) => !opensMatrixLine(line))
    .join('\n');
}

function lineValue(body: string, opener: string): string | undefined {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith(opener)) {
      return trimmed.slice(opener.length).trim();
    }
  }

  return undefined;
}

function cellOf(glyph: string): MatrixCell | undefined {
  const name = GLYPHS.get(glyph);

  return name === undefined ? undefined : { glyph, name };
}

function cellsOf(body: string, width: number): MatrixCell[] | undefined {
  const raw = lineValue(body, VERDICTS_OPENER);

  if (raw === undefined) {
    return undefined;
  }

  const cells = raw.split('|').map((glyph) => cellOf(glyph.trim()));
  const known = cells.flatMap((cell) => (cell === undefined ? [] : [cell]));

  return cells.length === width && known.length === width ? known : undefined;
}

function driverOf(line: string): string[] {
  const trimmed = line.trim();

  return trimmed.startsWith('- ') ? [trimmed.slice(2).trim()] : [];
}

function driversOf(parts: Part[]): string[] {
  const section = parts.find((part) => part.heading === 'Decision drivers');

  return section === undefined ? [] : section.body.split('\n').flatMap(driverOf);
}

function chosenRow(parts: Part[], width: number): MatrixRow | undefined {
  const section = parts.find((part) => part.heading === 'Decision');

  if (section === undefined) {
    return undefined;
  }

  const option = lineValue(section.body, OPTION_OPENER);
  const cells = cellsOf(section.body, width);

  return option === undefined || cells === undefined ? undefined : { option, chosen: true, cells };
}

function alternativeRows(parts: Part[], width: number): MatrixRow[] {
  const section = parts.find((part) => part.heading === 'Alternatives');

  if (section === undefined) {
    return [];
  }

  return splitOnHeading(section.body, '###').parts.flatMap((part) => {
    const cells = cellsOf(part.body, width);

    return cells === undefined ? [] : [{ option: part.heading, chosen: false, cells }];
  });
}

function matrixOf(source: string): Matrix | undefined {
  const top = splitOnHeading(source, '#').parts[0];

  if (top === undefined) {
    return undefined;
  }

  const parts = splitOnHeading(top.body, '##').parts;
  const drivers = driversOf(parts);
  const chosen = chosenRow(parts, drivers.length);
  const rows = [
    ...(chosen === undefined ? [] : [chosen]),
    ...alternativeRows(parts, drivers.length),
  ];

  return rows.length === 0 ? undefined : { drivers, rows };
}

function cellMarkup(cell: MatrixCell): string {
  return `<td class="matrix-cell matrix-${cell.name}"><span class="matrix-glyph">${cell.glyph}</span></td>`;
}

function rowMarkup(row: MatrixRow): string {
  const mark = row.chosen ? '<span class="matrix-chosen">chosen</span>' : '';
  const state = row.chosen ? ' is-chosen' : '';

  return `<tr class="matrix-row${state}"><th scope="row" class="matrix-option">${escaped(row.option)}${mark}</th>${row.cells.map(cellMarkup).join('')}</tr>`;
}

export function driverMatrix(source: string): Panel | undefined {
  const matrix = matrixOf(source);

  if (matrix === undefined) {
    return undefined;
  }

  const head = matrix.drivers
    .map((driver) => `<th scope="col" class="matrix-driver">${escaped(driver)}</th>`)
    .join('');
  const body = `<div class="matrix-scroll"><table class="matrix">
<thead><tr><th scope="col" class="matrix-corner">Option</th>${head}</tr></thead>
<tbody>${matrix.rows.map(rowMarkup).join('')}</tbody>
</table></div>
${LEGEND}`;

  return panelOf('Drivers', body, { frame: 'collapsible' });
}
