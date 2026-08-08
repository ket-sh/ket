import type {
  ItemNoteView,
  JourneyBranchView,
  JourneyChildView,
  JourneyFilingView,
  JourneyPaneView,
  JourneyView,
} from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { ageOf, clipped, wrappedTo } from '../../../shared/lib';

export type PaneTone = 'key' | 'title' | 'state' | 'alert' | 'quiet' | 'link';

export interface PaneLine {
  text: string;
  tone: PaneTone;
}

export function toneColorOf(tone: PaneTone, theme: Theme): string {
  const tones: Record<PaneTone, string> = {
    key: theme.text,
    title: theme.text,
    state: theme.blue,
    alert: theme.red,
    quiet: theme.subtext,
    link: theme.green,
  };

  return tones[tone];
}

const TITLE_LINES = 3;

const SHIPPED = 'shipped';

function lineOf(text: string, tone: PaneTone): PaneLine {
  return { text, tone };
}

function nameLines(journey: JourneyView, facts: JourneyPaneView, room: number): PaneLine[] {
  return [
    lineOf(`${journey.item}  ${facts.kind} · ${facts.size}`, 'key'),
    ...wrappedTo(journey.title, room, TITLE_LINES).map((line) => lineOf(line, 'title')),
  ];
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

function artifactLines(journey: JourneyView): PaneLine[] {
  if (journey.artifacts.length === 0) {
    return [];
  }

  return [lineOf(`artifacts ${journey.artifacts.map((one) => one.name).join(', ')}`, 'quiet')];
}

function branchLines(branch: JourneyBranchView | undefined): PaneLine[] {
  if (branch === undefined) {
    return [];
  }

  const commits = branch.commits === 1 ? '1 commit' : `${String(branch.commits)} commits`;

  return [lineOf(`${branch.name} · ${commits}`, 'quiet')];
}

export function paneLinesOf(journey: JourneyView, now: string, room: number): PaneLine[] {
  const facts = journey.pane;

  return [
    ...nameLines(journey, facts, room),
    lineOf(`${facts.status} · stage ${String(facts.stageAt)} of ${String(facts.stageOf)}`, 'state'),
    ...alertLines(facts, journey.standing),
    ...narrationLines(facts.note, now),
    ...filedLines(facts.filed, now),
    ...agedLines(facts, now),
    ...parentLines(facts.parent),
    ...childrenLines(journey.children),
    ...artifactLines(journey),
    ...branchLines(facts.branch),
  ].map((line) => lineOf(clipped(line.text, room), line.tone));
}
