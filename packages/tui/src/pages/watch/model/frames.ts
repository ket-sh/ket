import type {
  DocsCatalogView,
  GateActionView,
  JourneyView,
  KanbanCardView,
  MapReadingView,
  MovedView,
  OplogEventView,
  SurfaceDocView,
} from '../../../shared/model';
import type { Draft } from '../lib/edit.ts';
import type { Audience } from '../lib/lines.ts';
import type { Direction } from './compass.ts';

export type JourneyTab = 'overview' | 'workflow' | 'children' | 'artifacts';

export type JourneyFocus = 'canvas' | 'pane';

export type DocsFocus = 'catalog' | 'detail';

export type Grow = (grow: (stack: Frame[]) => Frame[]) => void;

export type Frame =
  | { kind: 'board' }
  | { kind: 'map'; reading: MapReadingView; at: number }
  | { kind: 'oplog'; events: OplogEventView[]; sel: number }
  | { kind: 'docs'; catalog: DocsCatalogView; sel: number; focus: DocsFocus }
  | {
      kind: 'journey';
      journey: JourneyView;
      sel: string;
      tab: JourneyTab;
      pick: number;
      focus: JourneyFocus;
    }
  | {
      kind: 'surface';
      item: string;
      title: string;
      doc: SurfaceDocView;
      aud: Audience;
      off: number;
    }
  | {
      kind: 'gate';
      action: GateActionView;
      cardKey: string;
      cardTitle: string;
      phase: 'ask' | 'pass' | 'refuse';
      reason: string | undefined;
      since: number;
    }
  | {
      kind: 'edit';
      item: string;
      name: string;
      draft: Draft;
      dirty: boolean;
      savedAt: number | undefined;
    };

export type Tuning = 'toggle' | 'technical' | 'plain';

export interface FrameStack {
  frames: Frame[];
  top: Frame;
  dive: (key: string | undefined, tab?: JourneyTab) => void;
  tab: () => void;
  showTab: (tab: JourneyTab) => void;
  aim: (sel: string) => void;
  openMap: () => void;
  mapWalk: (name: string) => void;
  mapSeat: (at: number) => void;
  openLog: () => void;
  logSeat: (at: number) => void;
  logSlide: (delta: number, most: number) => void;
  openDocs: () => void;
  docsSeat: (at: number) => void;
  docsSlide: (delta: number, most: number) => void;
  docsFocus: (focus: DocsFocus) => void;
  enter: () => void;
  walk: (direction: Direction) => void;
  scroll: (delta: number, most: number) => void;
  tune: (tuning: Tuning) => void;
  gate: (action: GateActionView, card: KanbanCardView, tick: number) => void;
  pass: (tick: number) => void;
  edit: () => void;
  revise: (change: (draft: Draft) => Draft) => void;
  save: (tick: number) => void;
  pop: () => void;
  home: () => void;
}

function lastOf(nodes: JourneyView['nodes']): string | undefined {
  return nodes[0]?.id;
}

// The stage the item stands in is the last one it ever arrived at, whatever
// state that arrival left it wearing.
export function landingOf(journey: JourneyView): string {
  const arrived = [...journey.nodes].reverse().find((node) => node.at !== undefined);

  return arrived?.id ?? lastOf(journey.nodes) ?? '';
}

function restingStepOf(
  frame: Extract<Frame, { kind: 'board' | 'journey' | 'map' | 'oplog' | 'docs' }>,
): string {
  return frame.kind === 'journey' ? frame.journey.item : frame.kind;
}

function openedStepOf(frame: Extract<Frame, { kind: 'surface' | 'gate' | 'edit' }>): string {
  if (frame.kind === 'gate') {
    return frame.cardKey;
  }

  return frame.kind === 'edit' ? frame.name : (frame.title.split(' · ')[0] ?? '');
}

const RESTING = ['board', 'journey', 'map', 'oplog', 'docs'];

function isResting(
  frame: Frame,
): frame is Extract<Frame, { kind: 'board' | 'journey' | 'map' | 'oplog' | 'docs' }> {
  return RESTING.includes(frame.kind);
}

function crumbStepOf(frame: Frame): string {
  return isResting(frame) ? restingStepOf(frame) : openedStepOf(frame);
}

export function crumbOf(frames: Frame[]): string {
  return frames.map((frame) => crumbStepOf(frame)).join(' › ');
}

export function scrolled(stack: Frame[], delta: number, most: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'surface') {
    return stack;
  }

  const seated = Math.min(Math.max(above.off, 0), most);
  const off = Math.min(most, Math.max(0, seated + delta));

  return [...stack.slice(0, -1), { ...above, off }];
}

function tunedSide(aud: Audience, tuning: Tuning): Audience {
  if (tuning === 'toggle') {
    return aud === 'technical' ? 'plain' : 'technical';
  }

  return tuning;
}

export function judged(stack: Frame[], outcome: MovedView, tick: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'gate') {
    return stack;
  }

  const next: Frame =
    'moved' in outcome
      ? { ...above, phase: 'pass', since: tick }
      : { ...above, phase: 'refuse', reason: outcome.refused, since: tick };

  return [...stack.slice(0, -1), next];
}

const PASS_TICKS = 16;

export function outstayed(frame: Frame, tick: number): boolean {
  return frame.kind === 'gate' && frame.phase === 'pass' && tick - frame.since > PASS_TICKS;
}

export function tuned(stack: Frame[], tuning: Tuning): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'surface' || !('plain' in above.doc) || above.doc.plain === undefined) {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, aud: tunedSide(above.aud, tuning), off: 0 }];
}

interface Seated {
  journey: JourneyView;
  node: JourneyView['nodes'][number];
}

export function selectedNodeOf(frame: Frame): Seated | undefined {
  if (frame.kind !== 'journey') {
    return undefined;
  }

  const node = frame.journey.nodes.find((one) => one.id === frame.sel);

  return node === undefined ? undefined : { journey: frame.journey, node };
}

export function surfaceFrame(journey: JourneyView, doc: SurfaceDocView): Frame {
  return {
    kind: 'surface',
    item: journey.item,
    title: `${journey.item} · ${doc.label}`,
    doc,
    aud: 'technical',
    off: 0,
  };
}

export function askFrameOf(action: GateActionView, card: KanbanCardView, tick: number): Frame {
  return {
    kind: 'gate',
    action,
    cardKey: card.key,
    cardTitle: card.title,
    phase: 'ask',
    reason: undefined,
    since: tick,
  };
}

export function editing(stack: Frame[]): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'surface' || above.doc.kind !== 'criteria') {
    return stack;
  }

  return [
    ...stack,
    {
      kind: 'edit',
      item: above.item,
      name: above.doc.name,
      draft: { lines: above.doc.source.split('\n'), cur: { l: 0, c: 0 } },
      dirty: false,
      savedAt: undefined,
    },
  ];
}

export function revisedIn(stack: Frame[], change: (draft: Draft) => Draft): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'edit') {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, draft: change(above.draft), dirty: true }];
}

export function savedMark(stack: Frame[], tick: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'edit') {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, dirty: false, savedAt: tick }];
}
