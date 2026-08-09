import type { JourneyView, SurfaceDocView } from '../../../shared/model';
import type { Audience } from '../lib/lines.ts';
import type { Direction } from './compass.ts';
import type { Frame, JourneyTab } from './frames.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';
import { docLines } from '../lib/lines.ts';
import { selectedNodeOf } from './frames.ts';

// The children tab only exists while the item has children, so a tab walk
// never lands on a panel with nothing to show.
export function tabsOf(journey: JourneyView): JourneyTab[] {
  const held: JourneyTab[] = ['workflow', 'overview'];

  return journey.children.length === 0
    ? [...held, 'artifacts']
    : [...held, 'children', 'artifacts'];
}

export function tabbed(stack: Frame[]): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  const tabs = tabsOf(above.journey);
  const next = tabs[(tabs.indexOf(above.tab) + 1) % tabs.length] ?? 'overview';

  return [...stack.slice(0, -1), { ...above, tab: next, pick: 0, cur: 0, focus: 'canvas' }];
}

export type Opened = Extract<Frame, { kind: 'journey' }>;

function listsRows(tab: JourneyTab): boolean {
  return tab === 'children' || tab === 'artifacts';
}

function roomIn(above: Opened): number {
  return above.tab === 'children' ? above.journey.children.length : above.journey.artifacts.length;
}

function stepOf(direction: Direction): number {
  if (direction === 'down') {
    return 1;
  }

  return direction === 'up' ? -1 : 0;
}

function walkedRows(above: Opened, direction: Direction): Opened {
  const pick = Math.min(
    Math.max(above.pick + stepOf(direction), 0),
    Math.max(0, roomIn(above) - 1),
  );

  return { ...above, pick };
}

// The pane sits past the last node, so the walk that finds no node to the
// right is the walk that lands in it. Only an item with children has anything
// there to hold the selection.
function paneReachable(above: Opened): boolean {
  return above.journey.children.length > 0;
}

function walkedCanvas(above: Opened, direction: Direction): Opened {
  const sel = neighborOf(placedOf(above.journey).nodes, above.sel, direction);

  if (direction === 'right' && sel === above.sel && paneReachable(above)) {
    return { ...above, focus: 'pane' };
  }

  return { ...above, sel };
}

function walkedPane(above: Opened, direction: Direction): Opened {
  return direction === 'left' ? { ...above, focus: 'canvas' } : above;
}

function readDocOf(above: Opened): SurfaceDocView | undefined {
  return above.journey.artifacts[above.pick]?.doc;
}

function walkedTabs(above: Opened, direction: Direction): Opened {
  if (direction === 'down') {
    return { ...above, focus: 'canvas' };
  }

  if (direction === 'up') {
    return above;
  }

  const tabs = tabsOf(above.journey);
  const at = tabs.indexOf(above.tab) + (direction === 'right' ? 1 : -1);
  const landing = tabs[Math.min(Math.max(at, 0), tabs.length - 1)] ?? above.tab;

  return { ...above, tab: landing, pick: 0, cur: 0 };
}

function walkedReading(above: Opened, direction: Direction): Opened {
  if (direction === 'left') {
    return { ...above, focus: 'canvas' };
  }

  const doc = readDocOf(above);
  const held = doc === undefined ? 0 : docLines(doc, above.aud).length;
  const cur = Math.min(Math.max(above.cur + stepOf(direction), 0), Math.max(0, held - 1));

  return { ...above, cur };
}

function enteredReading(above: Opened): Opened {
  return above.tab === 'artifacts' && readDocOf(above) !== undefined
    ? { ...above, focus: 'content', cur: 0 }
    : above;
}

function steppedRows(above: Opened, direction: Direction): Opened {
  if (above.focus === 'content') {
    return walkedReading(above, direction);
  }

  if (direction === 'right') {
    return enteredReading(above);
  }

  return direction === 'up' && above.pick === 0
    ? { ...above, focus: 'tabs' }
    : walkedRows(above, direction);
}

function steppedIn(above: Opened, direction: Direction): Opened {
  if (above.focus === 'tabs') {
    return walkedTabs(above, direction);
  }

  if (listsRows(above.tab)) {
    return steppedRows(above, direction);
  }

  return above.focus === 'pane' ? walkedPane(above, direction) : walkedCanvas(above, direction);
}

export function walked(stack: Frame[], direction: Direction): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  return [...stack.slice(0, -1), steppedIn(above, direction)];
}

export function tabbedTo(stack: Frame[], tab: JourneyTab): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, tab, pick: 0, cur: 0, focus: 'canvas' }];
}

export function picked(stack: Frame[], at: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey' || !listsRows(above.tab)) {
    return stack;
  }

  const pick = Math.min(Math.max(at, 0), Math.max(0, roomIn(above) - 1));

  return [...stack.slice(0, -1), { ...above, pick, cur: 0 }];
}

export function sided(stack: Frame[], aud: Audience): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, aud, cur: 0 }];
}

export function widened(stack: Frame[]): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, wide: !above.wide }];
}

export function aimedAt(stack: Frame[], sel: string): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey' || !above.journey.nodes.some((node) => node.id === sel)) {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, sel, focus: 'canvas' }];
}

export interface Doors {
  dive: (key: string | undefined) => void;
  open: (journey: JourneyView, doc: SurfaceDocView) => void;
  showTab: (tab: JourneyTab) => void;
}

function enteredChild(frame: Opened, doors: Doors): void {
  doors.dive(frame.journey.children[frame.pick]?.key);
}

function enteredArtifact(frame: Opened, doors: Doors): void {
  const doc = frame.journey.artifacts[frame.pick]?.doc;

  if (doc !== undefined) {
    doors.open(frame.journey, doc);
  }
}

function enteredStage(frame: Opened, doors: Doors): void {
  const seated = selectedNodeOf(frame);

  if (seated?.node.doc !== undefined) {
    doors.open(seated.journey, seated.node.doc);
  }
}

function enteredWorkflow(frame: Opened, doors: Doors): void {
  if (frame.focus === 'pane') {
    doors.showTab('children');

    return;
  }

  enteredStage(frame, doors);
}

const DOORWAYS: Record<JourneyTab, (frame: Opened, doors: Doors) => void> = {
  overview: enteredStage,
  workflow: enteredWorkflow,
  children: enteredChild,
  artifacts: enteredArtifact,
};

export function enteredIn(frame: Opened, doors: Doors): void {
  DOORWAYS[frame.tab](frame, doors);
}
