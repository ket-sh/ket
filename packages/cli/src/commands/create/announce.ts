import type { GateSemantics } from '@ket/preset-cli';

import { intro, outro } from '@clack/prompts';
import color from 'picocolors';

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
  intro(color.dim('a project, and the gates that keep it honest'));
}

export function announce(
  directory: string,
  scripts: Record<string, string>,
  gates: GateSemantics[],
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
  console.log(`${INDENT}${color.dim('More at')} ${color.cyan(DOCS)}\n`);
}
