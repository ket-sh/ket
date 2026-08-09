import type { Ln } from '../../../shared/lib';
import type { SurfaceDocView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { KANAGAWA } from '../../../shared/theme';
import { legendLn, sketchLines } from './mini-sketch.ts';
import { blastLn, criteriaLn, decisionRows, diffLn, ledgerLn } from './panel-lines.ts';
import { blank, proseLn } from './pen.ts';

export type Audience = 'technical' | 'plain';

type Sided = Extract<SurfaceDocView, { kind: 'prose' | 'design' | 'decision' }>;

type Flat = Exclude<SurfaceDocView, Sided>;

function wornPill(label: string, theme: Theme): Ln[number] {
  return { text: ` ${label} `, fg: theme.base, bg: theme.blue };
}

function restingPill(label: string, theme: Theme): Ln[number] {
  return { text: ` ${label} `, fg: theme.overlay };
}

function pillOf(label: string, audience: Audience, side: Audience, theme: Theme): Ln[number] {
  return audience === side ? wornPill(label, theme) : restingPill(label, theme);
}

const TECHNICAL_PILL = ' Technical ';

const PILL_GAP = '  ';

const PLAIN_PILL = ' Plain language ';

function audienceTabs(doc: Sided, audience: Audience, theme: Theme): Ln {
  const tabs: Ln = [pillOf('Technical', audience, 'technical', theme), { text: PILL_GAP }];

  if (doc.plain === undefined) {
    tabs.push({ text: PLAIN_PILL, fg: theme.surface1 });
    tabs.push({ text: '  No plain version written.', fg: theme.overlay });

    return tabs;
  }

  tabs.push(pillOf('Plain language', audience, 'plain', theme));

  const note = 'note' in doc ? doc.note : undefined;

  if (note !== undefined) {
    tabs.push({ text: `  ${note}`, fg: theme.yellow });
  }

  return tabs;
}

function shownSide(doc: Sided, audience: Audience): string {
  return audience === 'plain' && doc.plain !== undefined ? doc.plain : doc.tech;
}

function designLines(
  doc: Extract<SurfaceDocView, { kind: 'design' }>,
  tabs: Ln,
  shown: string,
  audience: Audience,
  theme: Theme,
): Ln[] {
  const marked = audience === 'technical' ? doc.callouts : [];
  const drawn =
    doc.sketch === undefined ? [] : [blank(), ...sketchLines(doc.sketch, doc.callouts, theme)];

  return [
    tabs,
    blank(),
    ...proseLn(shown, marked, theme),
    ...drawn,
    blank(),
    ...legendLn(doc.callouts, theme),
  ];
}

function sidedLines(doc: Sided, audience: Audience, theme: Theme): Ln[] {
  const tabs = audienceTabs(doc, audience, theme);
  const shown = shownSide(doc, audience);

  if (doc.kind === 'decision') {
    return [tabs, blank(), ...proseLn(shown, [], theme), blank(), ...decisionRows(doc, theme)];
  }

  if (doc.kind === 'design') {
    return designLines(doc, tabs, shown, audience, theme);
  }

  return [tabs, blank(), ...proseLn(shown, [], theme)];
}

function flatLines(doc: Flat, theme: Theme): Ln[] {
  if (doc.kind === 'criteria') {
    return criteriaLn(doc.name, doc.source, theme);
  }

  if (doc.kind === 'diff') {
    return diffLn(doc.text, theme);
  }

  if (doc.kind === 'blast') {
    return blastLn(doc, theme);
  }

  if (doc.kind === 'ledger') {
    return ledgerLn(doc, theme);
  }

  return [
    ...sketchLines(doc.sketch, doc.callouts, theme),
    blank(),
    ...legendLn(doc.callouts, theme),
  ];
}

export function docLines(doc: SurfaceDocView, audience: Audience, theme: Theme = KANAGAWA): Ln[] {
  if (doc.kind === 'prose' || doc.kind === 'design' || doc.kind === 'decision') {
    return sidedLines(doc, audience, theme);
  }

  return flatLines(doc, theme);
}

function sidedOf(doc: SurfaceDocView): Sided | undefined {
  return doc.kind === 'prose' || doc.kind === 'design' || doc.kind === 'decision' ? doc : undefined;
}

function pillSideAt(column: number): Audience | undefined {
  if (column >= 0 && column < TECHNICAL_PILL.length) {
    return 'technical';
  }

  const start = TECHNICAL_PILL.length + PILL_GAP.length;

  return column >= start && column < start + PLAIN_PILL.length ? 'plain' : undefined;
}

export function audienceAt(doc: SurfaceDocView, column: number): Audience | undefined {
  const sided = sidedOf(doc);

  return sided?.plain === undefined ? undefined : pillSideAt(column);
}
