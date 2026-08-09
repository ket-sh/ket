import type {
  GateActionView,
  ItemNoteView,
  JourneyBranchView,
  JourneyChildView,
  JourneyFilingView,
  JourneyPaneView,
  JourneyView,
} from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { ageOf, clipped, wrappedTo } from '../../../shared/lib';
import { GATE_KEYS } from '../model/gate-keys.ts';

export type PaneTone = 'key' | 'title' | 'head' | 'state' | 'offer' | 'alert' | 'quiet' | 'link';

export interface PaneLine {
  text: string;
  tone: PaneTone;
}

export function toneColorOf(tone: PaneTone, theme: Theme): string {
  const tones: Record<PaneTone, string> = {
    key: theme.text,
    title: theme.text,
    head: theme.overlay,
    state: theme.blue,
    offer: theme.yellow,
    alert: theme.red,
    quiet: theme.subtext,
    link: theme.green,
  };

  return tones[tone];
}

const TITLE_LINES = 3;

const SHIPPED = 'shipped';

const HUMAN_GATE = '‖';

function lineOf(text: string, tone: PaneTone): PaneLine {
  return { text, tone };
}

function headOf(label: string, room: number): PaneLine {
  const lead = `─ ${label} `;

  return lineOf(`${lead}${'─'.repeat(Math.max(0, room - lead.length))}`, 'head');
}

function sectionOf(label: string, lines: PaneLine[], room: number): PaneLine[] {
  return lines.length === 0 ? [] : [headOf(label, room), ...lines];
}

function nameLines(journey: JourneyView, facts: JourneyPaneView, room: number): PaneLine[] {
  return [
    lineOf(`${journey.item}  ${facts.kind} · ${facts.size}`, 'key'),
    ...wrappedTo(journey.title, room, TITLE_LINES).map((line) => lineOf(line, 'title')),
  ];
}

function keyFor(action: GateActionView): string {
  return Object.entries(GATE_KEYS).find(([, offered]) => offered === action)?.[0] ?? '';
}

function offerLines(offers: GateActionView[]): PaneLine[] {
  return offers.map((action) =>
    lineOf(`${HUMAN_GATE} press ${keyFor(action)} to ${action}`, 'offer'),
  );
}

function alertLines(facts: JourneyPaneView, standing: string | undefined): PaneLine[] {
  if (facts.refusedTimes === 0) {
    return [];
  }

  const count = `refused ${String(facts.refusedTimes)}x`;

  return [lineOf(standing === undefined ? count : `${count}  ${standing}`, 'alert')];
}

function filedLines(filed: JourneyFilingView | undefined, now: string): PaneLine[] {
  return filed === undefined
    ? []
    : [lineOf(`filed by ${filed.by} · ${ageOf(filed.at, now)} ago`, 'quiet')];
}

function narrationLines(note: ItemNoteView | undefined, now: string): PaneLine[] {
  if (note === undefined) {
    return [];
  }

  return [
    lineOf(note.text, 'quiet'),
    lineOf(`by ${note.actor} · ${ageOf(note.at, now)} ago`, 'quiet'),
  ];
}

function agedLines(facts: JourneyPaneView, now: string): PaneLine[] {
  const held = facts.arrivedAt === undefined ? [] : [`in stage ${ageOf(facts.arrivedAt, now)}`];
  const heard =
    facts.lastEventAt === undefined ? [] : [`last event ${ageOf(facts.lastEventAt, now)} ago`];

  return [...held, ...heard].map((text) => lineOf(text, 'quiet'));
}

function parentLines(parent: string | undefined): PaneLine[] {
  return parent === undefined ? [] : [lineOf(`parent ${parent}`, 'quiet')];
}

function childrenLines(children: JourneyChildView[]): PaneLine[] {
  if (children.length === 0) {
    return [];
  }

  const done = children.filter((child) => child.status === SHIPPED).length;

  return [lineOf(`children ${String(done)}/${String(children.length)} shipped`, 'link')];
}

function branchLines(branch: JourneyBranchView | undefined): PaneLine[] {
  if (branch === undefined) {
    return [];
  }

  const commits = branch.commits === 1 ? '1 commit' : `${String(branch.commits)} commits`;

  return [lineOf(`${branch.name} · ${commits}`, 'quiet')];
}

function stateSection(journey: JourneyView, now: string, room: number): PaneLine[] {
  const facts = journey.pane;
  const stage = `${facts.status} · stage ${String(facts.stageAt)} of ${String(facts.stageOf)}`;

  return sectionOf('state', [lineOf(stage, 'state'), ...agedLines(facts, now)], room);
}

function yoursSection(journey: JourneyView, room: number): PaneLine[] {
  const facts = journey.pane;

  return sectionOf(
    'yours',
    [...offerLines(facts.offers), ...alertLines(facts, journey.standing)],
    room,
  );
}

function lineageSection(journey: JourneyView, room: number): PaneLine[] {
  return sectionOf(
    'lineage',
    [...parentLines(journey.pane.parent), ...childrenLines(journey.children)],
    room,
  );
}

function repoSection(facts: JourneyPaneView, now: string, room: number): PaneLine[] {
  return sectionOf('repo', [...filedLines(facts.filed, now), ...branchLines(facts.branch)], room);
}

export function paneLinesOf(journey: JourneyView, now: string, room: number): PaneLine[] {
  const facts = journey.pane;

  return [
    ...nameLines(journey, facts, room),
    ...stateSection(journey, now, room),
    ...yoursSection(journey, room),
    ...sectionOf('word', narrationLines(facts.note, now), room),
    ...lineageSection(journey, room),
    ...repoSection(facts, now, room),
  ].map((line) => lineOf(clipped(line.text, room), line.tone));
}
