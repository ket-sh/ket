import type { MatrixCell, MatrixRow } from '../../../shared/matrix.ts';
import type { Panel } from './panel.ts';

import { matrixOf } from '../../../shared/matrix.ts';
import { panelOf } from './panel.ts';
import { escaped } from './text.ts';

export { withoutMatrixLines } from '../../../shared/matrix.ts';

const LEGEND = `<p class="matrix-legend"><span><code>++</code> strongly meets</span><span><code>+</code> meets</span><span><code>0</code> neutral</span><span><code>-</code> misses</span><span><code>--</code> strongly misses</span><span><code>X</code> ruled out</span><span><code>?</code> unknown</span></p>
<p class="matrix-note">No column is summed and no row is scored. The matrix shows the reading, the decision stays in the prose.</p>`;

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
