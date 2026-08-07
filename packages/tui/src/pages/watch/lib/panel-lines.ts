import type { Ln } from '../../../shared/lib';
import type { SurfaceDocView } from '../../../shared/model';

import {
  BASE,
  BLUE,
  GREEN,
  OVERLAY,
  RED,
  SUBTEXT,
  SURFACE1,
  TEXT,
  VIOLET,
  YELLOW,
} from '../../../shared/theme';
import { sketchLines } from './mini-sketch.ts';
import { blank } from './pen.ts';

const MATRIX_FG: Record<string, string> = {
  '++': GREEN,
  '+': GREEN,
  '0': SUBTEXT,
  '-': RED,
  '--': RED,
  X: RED,
  '?': OVERLAY,
};

type DecisionDoc = Extract<SurfaceDocView, { kind: 'decision' }>;

type BlastDoc = Extract<SurfaceDocView, { kind: 'blast' }>;

type LedgerDoc = Extract<SurfaceDocView, { kind: 'ledger' }>;

function optionSpans(row: DecisionDoc['rows'][number], width: number): Ln {
  const tag = row.chosen ? ' chosen ' : '';

  return [
    { text: row.option, fg: row.chosen ? YELLOW : TEXT },
    { text: tag, fg: BASE, bg: row.chosen ? YELLOW : undefined },
    { text: ''.padEnd(Math.max(0, width - row.option.length - tag.length)) },
  ];
}

export function decisionRows(doc: DecisionDoc): Ln[] {
  const optionWidth = Math.max(6, ...doc.rows.map((row) => row.option.length)) + 9;
  const cellWidth = Math.max(4, ...doc.drivers.map((driver) => driver.length)) + 2;
  const head: Ln = [
    { text: 'Option'.padEnd(optionWidth), fg: SUBTEXT },
    ...doc.drivers.map((driver) => ({ text: driver.padEnd(cellWidth), fg: SUBTEXT })),
  ];
  const body = doc.rows.map(
    (row): Ln => [
      ...optionSpans(row, optionWidth),
      ...row.glyphs.map((glyph) => ({
        text: glyph.padEnd(cellWidth),
        fg: MATRIX_FG[glyph] ?? TEXT,
      })),
    ],
  );

  return [
    [{ text: 'Drivers', fg: BLUE }],
    blank(),
    head,
    [{ text: '─'.repeat(optionWidth + cellWidth * doc.drivers.length), fg: SURFACE1 }],
    ...body,
    blank(),
    [
      {
        text: '++ strongly meets   + meets   0 neutral   - misses   -- strongly misses   X ruled out   ? unknown',
        fg: SUBTEXT,
      },
    ],
    [
      {
        text: 'No column is summed and no row is scored. The matrix shows the reading, the decision stays in the prose.',
        fg: OVERLAY,
      },
    ],
  ];
}

const GHERKIN_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'];

function scenarioLine(lead: string, pad: number): Ln | undefined {
  if (!lead.startsWith('Feature:') && !lead.startsWith('Scenario:')) {
    return undefined;
  }

  const [word = '', ...rest] = lead.split(' ');

  return [
    { text: ' '.repeat(pad) },
    { text: word, fg: BLUE },
    { text: ` ${rest.join(' ')}`, fg: TEXT },
  ];
}

function stepLine(lead: string, pad: number): Ln | undefined {
  const keyword = GHERKIN_KEYWORDS.find((word) => lead.startsWith(`${word} `));

  if (keyword === undefined) {
    return undefined;
  }

  return [
    { text: ' '.repeat(pad) },
    { text: keyword, fg: VIOLET },
    { text: lead.slice(keyword.length), fg: TEXT },
  ];
}

function gherkinLine(line: string): Ln {
  if (line === '') {
    return blank();
  }

  const lead = line.trimStart();
  const pad = line.length - lead.length;

  return scenarioLine(lead, pad) ?? stepLine(lead, pad) ?? [{ text: line, fg: SUBTEXT }];
}

export function criteriaLn(name: string, source: string): Ln[] {
  const head: Ln = [{ text: ` ${name} `, fg: TEXT, bg: SURFACE1 }];

  return [head, blank(), ...source.split('\n').map(gherkinLine)];
}

const DIFF_TINTS: [string, string][] = [
  ['+++', BLUE],
  ['---', BLUE],
  ['@@', SUBTEXT],
  ['+', GREEN],
  ['-', RED],
];

function diffLine(line: string): Ln {
  if (line === '') {
    return blank();
  }

  const tint = DIFF_TINTS.find(([lead]) => line.startsWith(lead));

  return [{ text: line, fg: tint?.[1] ?? SUBTEXT }];
}

export function diffLn(text: string): Ln[] {
  const format: Ln = [
    { text: ' Unified ', fg: BASE, bg: BLUE },
    { text: '  Side by side ', fg: OVERLAY },
  ];

  return [format, blank(), ...text.split('\n').map(diffLine)];
}

function budgetNote(doc: BlastDoc): string {
  if (doc.uncollapsedNodes > doc.budget) {
    return `Collapsed to ${String(doc.collapse)} path segments so ${String(doc.shown)} nodes stay inside the ${String(doc.budget)} node budget. The uncollapsed graph carries ${String(doc.uncollapsedNodes)} modules and ${String(doc.uncollapsedEdges)} edges.`;
  }

  return `No collapsing was needed: the uncollapsed graph already fits the ${String(doc.budget)} node budget.`;
}

function chip(label: string, value: string): Ln {
  return [
    { text: ` ${label} `, fg: BASE, bg: OVERLAY },
    { text: ` ${value}   `, fg: TEXT },
  ];
}

export function blastLn(doc: BlastDoc): Ln[] {
  return [
    [
      ...chip('base', doc.base),
      ...chip('collapse', String(doc.collapse)),
      ...chip('budget', String(doc.budget)),
    ],
    blank(),
    ...sketchLines(doc.sketch, []),
    blank(),
    [{ text: budgetNote(doc), fg: SUBTEXT }],
  ];
}

export function ledgerLn(doc: LedgerDoc): Ln[] {
  return doc.lines.map((line) => [
    { text: `${line.at}  `, fg: OVERLAY },
    { text: line.text, fg: line.refused ? RED : TEXT },
  ]);
}
