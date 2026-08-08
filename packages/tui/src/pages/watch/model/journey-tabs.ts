import type { JourneyView, SurfaceDocView } from '../../../shared/model';
import type { Direction } from './compass.ts';
import type { Frame, JourneyTab } from './frames.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';
import { selectedNodeOf } from './frames.ts';

// The children tab only exists while the item has children, so a tab walk
// never lands on a panel with nothing to show.
export function tabsOf(journey: JourneyView): JourneyTab[] {
  const held: JourneyTab[] = ['overview', 'workflow'];

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

  return [...stack.slice(0, -1), { ...above, tab: next, pick: 0 }];
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

function steppedIn(above: Opened, direction: Direction): Opened {
  if (listsRows(above.tab)) {
    return walkedRows(above, direction);
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

  return [...stack.slice(0, -1), { ...above, tab, pick: 0, focus: 'canvas' }];
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
