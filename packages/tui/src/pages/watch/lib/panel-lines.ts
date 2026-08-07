import type { Ln } from '../../../shared/lib';
import type { SurfaceDocView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { KANAGAWA } from '../../../shared/theme';
import { sketchLines } from './mini-sketch.ts';
import { blank } from './pen.ts';

function matrixTintOf(glyph: string, theme: Theme): string {
  const tints: Record<string, string> = {
    '++': theme.green,
    '+': theme.green,
    '0': theme.subtext,
    '-': theme.red,
    '--': theme.red,
    X: theme.red,
    '?': theme.overlay,
  };

  return tints[glyph] ?? theme.text;
}

type DecisionDoc = Extract<SurfaceDocView, { kind: 'decision' }>;

type BlastDoc = Extract<SurfaceDocView, { kind: 'blast' }>;

type LedgerDoc = Extract<SurfaceDocView, { kind: 'ledger' }>;

function optionSpans(row: DecisionDoc['rows'][number], width: number, theme: Theme): Ln {
  const tag = row.chosen ? ' chosen ' : '';

  return [
    { text: row.option, fg: row.chosen ? theme.yellow : theme.text },
    { text: tag, fg: theme.base, bg: row.chosen ? theme.yellow : undefined },
    { text: ''.padEnd(Math.max(0, width - row.option.length - tag.length)) },
  ];
}

export function decisionRows(doc: DecisionDoc, theme: Theme = KANAGAWA): Ln[] {
  const optionWidth = Math.max(6, ...doc.rows.map((row) => row.option.length)) + 9;
  const cellWidth = Math.max(4, ...doc.drivers.map((driver) => driver.length)) + 2;
  const head: Ln = [
    { text: 'Option'.padEnd(optionWidth), fg: theme.subtext },
    ...doc.drivers.map((driver) => ({ text: driver.padEnd(cellWidth), fg: theme.subtext })),
  ];
  const body = doc.rows.map(
    (row): Ln => [
      ...optionSpans(row, optionWidth, theme),
      ...row.glyphs.map((glyph) => ({
        text: glyph.padEnd(cellWidth),
        fg: matrixTintOf(glyph, theme),
      })),
    ],
  );

  return [
    [{ text: 'Drivers', fg: theme.blue }],
    blank(),
    head,
    [{ text: '─'.repeat(optionWidth + cellWidth * doc.drivers.length), fg: theme.surface1 }],
    ...body,
    blank(),
    [
      {
        text: '++ strongly meets   + meets   0 neutral   - misses   -- strongly misses   X ruled out   ? unknown',
        fg: theme.subtext,
      },
    ],
    [
      {
        text: 'No column is summed and no row is scored. The matrix shows the reading, the decision stays in the prose.',
        fg: theme.overlay,
      },
    ],
  ];
}

const GHERKIN_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'];

function scenarioLine(lead: string, pad: number, theme: Theme): Ln | undefined {
  if (!lead.startsWith('Feature:') && !lead.startsWith('Scenario:')) {
    return undefined;
  }

  const [word = '', ...rest] = lead.split(' ');

  return [
    { text: ' '.repeat(pad) },
    { text: word, fg: theme.blue },
    { text: ` ${rest.join(' ')}`, fg: theme.text },
  ];
}

function stepLine(lead: string, pad: number, theme: Theme): Ln | undefined {
  const keyword = GHERKIN_KEYWORDS.find((word) => lead.startsWith(`${word} `));

  if (keyword === undefined) {
    return undefined;
  }

  return [
    { text: ' '.repeat(pad) },
    { text: keyword, fg: theme.violet },
    { text: lead.slice(keyword.length), fg: theme.text },
  ];
}

function gherkinLine(line: string, theme: Theme): Ln {
  if (line === '') {
    return blank();
  }

  const lead = line.trimStart();
  const pad = line.length - lead.length;

  return (
    scenarioLine(lead, pad, theme) ??
    stepLine(lead, pad, theme) ?? [{ text: line, fg: theme.subtext }]
  );
}

export function criteriaLn(name: string, source: string, theme: Theme = KANAGAWA): Ln[] {
  const head: Ln = [{ text: ` ${name} `, fg: theme.text, bg: theme.surface1 }];

  return [head, blank(), ...source.split('\n').map((line) => gherkinLine(line, theme))];
}

function diffTintOf(line: string, theme: Theme): string {
  const tints: [string, string][] = [
    ['+++', theme.blue],
    ['---', theme.blue],
    ['@@', theme.subtext],
    ['+', theme.green],
    ['-', theme.red],
  ];

  return tints.find(([lead]) => line.startsWith(lead))?.[1] ?? theme.subtext;
}

function diffLine(line: string, theme: Theme): Ln {
  if (line === '') {
    return blank();
  }

  return [{ text: line, fg: diffTintOf(line, theme) }];
}

export function diffLn(text: string, theme: Theme = KANAGAWA): Ln[] {
  const format: Ln = [
    { text: ' Unified ', fg: theme.base, bg: theme.blue },
    { text: '  Side by side ', fg: theme.overlay },
  ];

  return [format, blank(), ...text.split('\n').map((line) => diffLine(line, theme))];
}

function budgetNote(doc: BlastDoc): string {
  if (doc.uncollapsedNodes > doc.budget) {
    return `Collapsed to ${String(doc.collapse)} path segments so ${String(doc.shown)} nodes stay inside the ${String(doc.budget)} node budget. The uncollapsed graph carries ${String(doc.uncollapsedNodes)} modules and ${String(doc.uncollapsedEdges)} edges.`;
  }

  return `No collapsing was needed: the uncollapsed graph already fits the ${String(doc.budget)} node budget.`;
}

function chip(label: string, value: string, theme: Theme): Ln {
  return [
    { text: ` ${label} `, fg: theme.base, bg: theme.overlay },
    { text: ` ${value}   `, fg: theme.text },
  ];
}

export function blastLn(doc: BlastDoc, theme: Theme = KANAGAWA): Ln[] {
  return [
    [
      ...chip('base', doc.base, theme),
      ...chip('collapse', String(doc.collapse), theme),
      ...chip('budget', String(doc.budget), theme),
    ],
    blank(),
    ...sketchLines(doc.sketch, [], theme),
    blank(),
    [{ text: budgetNote(doc), fg: theme.subtext }],
  ];
}

export function ledgerLn(doc: LedgerDoc, theme: Theme = KANAGAWA): Ln[] {
  return doc.lines.map((line) => [
    { text: `${line.at}  `, fg: theme.overlay },
    { text: line.text, fg: line.refused ? theme.red : theme.text },
  ]);
}
