import type { GateSemantics } from '@ket/preset-cli';

import Table from 'cli-table3';
import color from 'picocolors';

const INDENT = '   ';

const ON_COMMIT = '⚙';

const ON_DEMAND = '▷';

const ROUNDED = {
  'top-left': '╭',
  'top-right': '╮',
  'bottom-left': '╰',
  'bottom-right': '╯',
  mid: '',
  'left-mid': '',
  'mid-mid': '',
  'right-mid': '',
};

const HEADINGS = ['', 'run', 'what it does'];

function marking(gate: GateSemantics): string {
  return gate.commitJob === '' ? color.dim(ON_DEMAND) : color.green(ON_COMMIT);
}

function legend(): string {
  return [
    `${color.green(ON_COMMIT)} ${color.dim('the commit hook runs it')}`,
    color.dim(`${ON_DEMAND} you run it when you want`),
  ].join('   ');
}

function ruleFrom(top: string, junction: string): string {
  return top.replace('╭', '├').replace('╮', '┤').replaceAll('┬', junction);
}

function ruled(drawn: string): string {
  const lines = drawn.split('\n');
  const top = drawn.slice(0, drawn.indexOf('\n'));
  const half = lines.length - 3;
  const closed = lines.map((line, at) => (at === half ? ruleFrom(top, '┴') : line));

  return [...closed.slice(0, 2), ruleFrom(top, '┼'), ...closed.slice(2)].join('\n');
}

function indented(drawn: string): string {
  return drawn
    .split('\n')
    .map((line) => `${INDENT}${line}`)
    .join('\n');
}

export function gateTable(gates: GateSemantics[]): string {
  const laid = new Table({ chars: ROUNDED });

  laid.push(HEADINGS.map((heading) => color.bold(heading)));

  for (const gate of gates) {
    laid.push([marking(gate), color.cyan(`bun run ${gate.script}`), color.dim(gate.guards)]);
  }

  laid.push([{ colSpan: 3, content: legend() }]);

  return indented(ruled(laid.toString()));
}
