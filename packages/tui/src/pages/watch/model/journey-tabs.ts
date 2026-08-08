import type { JourneyView } from '../../../shared/model';
import type { Direction } from './compass.ts';
import type { Frame, JourneyTab } from './frames.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';

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

function walkedCanvas(above: Opened, direction: Direction): Opened {
  return { ...above, sel: neighborOf(placedOf(above.journey).nodes, above.sel, direction) };
}

export function walked(stack: Frame[], direction: Direction): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  const moved = listsRows(above.tab)
    ? walkedRows(above, direction)
    : walkedCanvas(above, direction);

  return [...stack.slice(0, -1), moved];
}
