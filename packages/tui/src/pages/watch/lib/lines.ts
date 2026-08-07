import type { Ln } from '../../../shared/lib';
import type { SurfaceDocView } from '../../../shared/model';

import { BASE, BLUE, OVERLAY, SURFACE1, YELLOW } from '../../../shared/theme';
import { legendLn, sketchLines } from './mini-sketch.ts';
import { blastLn, criteriaLn, decisionRows, diffLn, ledgerLn } from './panel-lines.ts';
import { blank, proseLn } from './pen.ts';

export type Audience = 'technical' | 'plain';

type Sided = Extract<SurfaceDocView, { kind: 'prose' | 'design' | 'decision' }>;

type Flat = Exclude<SurfaceDocView, Sided>;

function wornPill(label: string): Ln[number] {
  return { text: ` ${label} `, fg: BASE, bg: BLUE };
}

function restingPill(label: string): Ln[number] {
  return { text: ` ${label} `, fg: OVERLAY };
}

function pillOf(label: string, audience: Audience, side: Audience): Ln[number] {
  return audience === side ? wornPill(label) : restingPill(label);
}

function audienceTabs(doc: Sided, audience: Audience): Ln {
  const tabs: Ln = [pillOf('Technical', audience, 'technical'), { text: '  ' }];

  if (doc.plain === undefined) {
    tabs.push({ text: ' Plain language ', fg: SURFACE1 });
    tabs.push({ text: '  No plain version written.', fg: OVERLAY });

    return tabs;
  }

  tabs.push(pillOf('Plain language', audience, 'plain'));

  const note = 'note' in doc ? doc.note : undefined;

  if (note !== undefined) {
    tabs.push({ text: `  ${note}`, fg: YELLOW });
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
): Ln[] {
  const marked = audience === 'technical' ? doc.callouts : [];
  const drawn = doc.sketch === undefined ? [] : [blank(), ...sketchLines(doc.sketch, doc.callouts)];

  return [tabs, blank(), ...proseLn(shown, marked), ...drawn, blank(), ...legendLn(doc.callouts)];
}

function sidedLines(doc: Sided, audience: Audience): Ln[] {
  const tabs = audienceTabs(doc, audience);
  const shown = shownSide(doc, audience);

  if (doc.kind === 'decision') {
    return [tabs, blank(), ...proseLn(shown), blank(), ...decisionRows(doc)];
  }

  if (doc.kind === 'design') {
    return designLines(doc, tabs, shown, audience);
  }

  return [tabs, blank(), ...proseLn(shown)];
}

function flatLines(doc: Flat): Ln[] {
  if (doc.kind === 'criteria') {
    return criteriaLn(doc.name, doc.source);
  }

  if (doc.kind === 'diff') {
    return diffLn(doc.text);
  }

  if (doc.kind === 'blast') {
    return blastLn(doc);
  }

  if (doc.kind === 'ledger') {
    return ledgerLn(doc);
  }

  return [...sketchLines(doc.sketch, doc.callouts), blank(), ...legendLn(doc.callouts)];
}

export function docLines(doc: SurfaceDocView, audience: Audience): Ln[] {
  if (doc.kind === 'prose' || doc.kind === 'design' || doc.kind === 'decision') {
    return sidedLines(doc, audience);
  }

  return flatLines(doc);
}
