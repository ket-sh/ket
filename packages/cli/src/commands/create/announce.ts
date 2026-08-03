import type { GateSemantics } from '@ket/preset';

import { intro, outro } from '@clack/prompts';
import color from 'picocolors';

import type { FirstCommit } from '../../shared/git.ts';
import type { Shade } from './banner.ts';
import type { Step } from './next-steps.ts';
import type { PipelineCommand } from './pipeline-commands.generated.ts';
import type { SkillsInstalled } from './skills.ts';

import { gradientOver, KET_BANNER, supportsTrueColor, toriiBeside } from './banner.ts';
import { commandTable } from './command-table.ts';
import { confetti } from './confetti.ts';
import { gateTable } from './gate-table.ts';
import { nextSteps } from './next-steps.ts';
import { skillsNote } from './skills.ts';
import { graphLines, paintedGraphLines, WORKFLOW_GRAPH } from './workflow-graph.ts';

const OPENS_AT: Shade = [34, 211, 238];

const CLOSES_AT: Shade = [167, 139, 250];

const INDENT = '   ';

const CELEBRATION = '🎉  ';

const READY = ' is ready';

const DRIVING = 'Then open Claude Code and drive it';

const DOCS = 'ket.sh/docs';

const UNCOMMITTED = 'The scaffold is written but git would not commit it:';

const GUTTER = '│';

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

function bannerLines(): string[] {
  const lines = shaded(KET_BANNER);

  return paintsGradient() ? toriiBeside(lines) : lines;
}

export function openCreate(): void {
  console.log(`\n${bannerLines().join('\n')}\n`);
  intro();
}

function workflowGraph(): string[] {
  return paintsGradient() ? paintedGraphLines(WORKFLOW_GRAPH) : graphLines(WORKFLOW_GRAPH);
}

export function drawWorkflow(): void {
  const drawn = workflowGraph().map((line) => `${color.gray(GUTTER)}  ${line}`);

  console.log(`${color.gray(GUTTER)}\n${drawn.join('\n')}`);
}

function commitNote(first: FirstCommit): string {
  if ('committed' in first) {
    return '';
  }

  return `${INDENT}${color.yellow(UNCOMMITTED)}\n${INDENT}${color.dim(first.refused)}\n`;
}

function asNoteLines(lines: string[]): string {
  const [heading, ...said] = lines;

  if (heading === undefined) {
    return '';
  }

  const rest = said.map((line) => `${INDENT}${color.dim(line)}`);

  return `${INDENT}${color.yellow(heading)}\n${rest.join('\n')}\n`;
}

function pipelineNote(commands: PipelineCommand[]): string {
  if (commands.length === 0) {
    return '';
  }

  return `${INDENT}${color.dim(DRIVING)}\n\n${commandTable(commands)}\n`;
}

export function announce(
  directory: string,
  scripts: Record<string, string>,
  gates: GateSemantics[],
  first: FirstCommit,
  skills: SkillsInstalled,
  pipeline: PipelineCommand[],
): void {
  outro(color.dim('Project created'));

  const ready = `${CELEBRATION}${directory}${READY}`;

  console.log(scattered(ready.length, directory));
  console.log(`${INDENT}${CELEBRATION}${color.bold(directory)}${READY}`);
  console.log(`${scattered(ready.length, `${directory} again`)}\n`);
  console.log(`${asStepLines(nextSteps(directory, scripts))}\n`);
  console.log(`${gateTable(gates)}\n`);
  console.log(pipelineNote(pipeline));
  console.log(asNoteLines(skillsNote(skills)));
  console.log(commitNote(first));
  console.log(`${INDENT}${color.dim('More at')} ${color.cyan(DOCS)}\n`);
}
