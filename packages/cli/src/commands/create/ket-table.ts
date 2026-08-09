import color from 'picocolors';

import { KET_PARTS } from '../../shared/parts.ts';
import { boxed } from './table.ts';

const HEADINGS = ['command', 'what it does'];

const CLOSING = 'ket <command> --help says more about each';

export function ketTable(): string {
  const rows = KET_PARTS.map((part) => [color.cyan(`ket ${part.name}`), color.dim(part.says)]);

  return boxed(HEADINGS, rows, color.dim(CLOSING));
}
