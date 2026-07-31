import Table from 'cli-table3';
import color from 'picocolors';

const INDENT = '   ';

const ROUNDED = {
  'top-left': '╭',
  'top-right': '╮',
  'bottom-left': '╰',
  'bottom-right': '╯',
};

function ruleFrom(top: string, junction: string): string {
  return top.replace('╭', '├').replace('╮', '┤').replaceAll('┬', junction);
}

const HEADING_ROW = 2;

const WALL = '│';

// Above a spanning row the table library leaves a stub of bare half rules for
// some column counts and nothing at all for others. Keeping the lines that
// carry a wall drops the stub either way, where counting to it cost a row on
// the day the library drew nothing.
function ruled(drawn: string): string {
  const lines = drawn.split('\n');
  const top = drawn.slice(0, drawn.indexOf('\n'));
  const footerRow = lines.length - 2;
  const body = lines.slice(HEADING_ROW, footerRow).filter((line) => line.includes(WALL));

  return [
    ...lines.slice(0, HEADING_ROW),
    ruleFrom(top, '┼'),
    ...body,
    ruleFrom(top, '┴'),
    ...lines.slice(footerRow),
  ].join('\n');
}

function indented(drawn: string): string {
  return drawn
    .split('\n')
    .map((line) => `${INDENT}${line}`)
    .join('\n');
}

export function boxed(headings: string[], rows: string[][], footer: string): string {
  const laid = new Table({ chars: ROUNDED });

  laid.push(headings.map((heading) => color.bold(heading)));

  for (const row of rows) {
    laid.push(row);
  }

  laid.push([{ colSpan: headings.length, content: footer }]);

  return indented(ruled(laid.toString()));
}
