import color from 'picocolors';

import type { PipelineCommand } from './pipeline-commands.generated.ts';

import { boxed } from './table.ts';

const HEADINGS = ['type', 'what it does'];

const CLOSING = 'the pipeline runs itself between the two gates it waits at';

export function commandTable(commands: PipelineCommand[]): string {
  const rows = commands.map((command) => [
    color.cyan(`/ket:${command.name}`),
    color.dim(command.says),
  ]);

  return boxed(HEADINGS, rows, color.dim(CLOSING));
}
