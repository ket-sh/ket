import type { GateSemantics } from '@ket/preset-cli';

import color from 'picocolors';

import { boxed } from './table.ts';

const ON_COMMIT = '⚙';

const ON_DEMAND = '▷';

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

export function gateTable(gates: GateSemantics[]): string {
  const rows = gates.map((gate) => [
    marking(gate),
    color.cyan(`bun run ${gate.script}`),
    color.dim(gate.guards),
  ]);

  return boxed(HEADINGS, rows, legend());
}
