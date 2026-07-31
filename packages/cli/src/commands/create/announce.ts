import type { GateSemantics } from '@ket/preset';

import { intro, outro } from '@clack/prompts';
import color from 'picocolors';

import type { FirstCommit } from '../../shared/git.ts';
import type { Shade } from './banner.ts';
import type { Step } from './next-steps.ts';

import { gradientOver, KET_BANNER, supportsTrueColor } from './banner.ts';
import { commandTable } from './command-table.ts';
import { confetti } from './confetti.ts';
import { gateTable } from './gate-table.ts';
import { nextSteps } from './next-steps.ts';
import { PIPELINE_COMMANDS } from './pipeline-commands.generated.ts';

const OPENS_AT: Shade = [34, 211, 238];

const CLOSES_AT: Shade = [167, 139, 250];

const INDENT = '   ';

const CELEBRATION = '🎉  ';

const READY = ' is ready';

const DRIVING = 'Then open Claude Code and drive it';

const DOCS = 'ket.sh/docs';

const UNCOMMITTED = 'The scaffold is written but git would not commit it:';

function paintsGradient(): boolean {
  return supportsTrueColor(process.env['COLORTERM'] ?? '', process.env['TERM'] ?? '');
}

function shaded(pieces: string[]): string[] {
  if (paintsGradient()) {
    return gradientOver(pieces, OPENS_AT, CLOSES_AT);
  }

  return color.isColorSupported ? pieces.map((piece) => color.cyan(piece)) : pieces;
}

function scattered(width: number, seed: string): string {
  return `${INDENT}${shaded(confetti(width, seed)).join('')}`;
}

function asStepLines(steps: Step[]): string {
  return steps
    .map((step) => `${INDENT}${color.dim(step.says)}\n${INDENT}${color.cyan(step.runs)}`)
    .join('\n\n');
}

export function openCreate(): void {
  console.log(`\n${shaded(KET_BANNER).join('\n')}\n`);
  intro();
}

function commitNote(first: FirstCommit): string {
  if ('committed' in first) {
    return '';
  }

  return `${INDENT}${color.yellow(UNCOMMITTED)}\n${INDENT}${color.dim(first.refused)}\n`;
}

export function announce(
  directory: string,
  scripts: Record<string, string>,
  gates: GateSemantics[],
  first: FirstCommit,
): void {
  outro(color.dim('Project created'));

  const ready = `${CELEBRATION}${directory}${READY}`;

  console.log(scattered(ready.length, directory));
  console.log(`${INDENT}${CELEBRATION}${color.bold(directory)}${READY}`);
  console.log(`${scattered(ready.length, `${directory} again`)}\n`);
  console.log(`${asStepLines(nextSteps(directory, scripts))}\n`);
  console.log(`${gateTable(gates)}\n`);
  console.log(`${INDENT}${color.dim(DRIVING)}\n`);
  console.log(`${commandTable(PIPELINE_COMMANDS)}\n`);
  console.log(commitNote(first));
  console.log(`${INDENT}${color.dim('More at')} ${color.cyan(DOCS)}\n`);
}
