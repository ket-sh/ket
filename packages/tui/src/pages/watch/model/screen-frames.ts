import type { DocsFocus, Frame } from './frames.ts';

import { walkedIn } from '../../../widgets/story-map';

function overTop(stack: Frame[], change: (above: Frame) => Frame | undefined): Frame[] {
  const above = stack[stack.length - 1];

  if (above === undefined) {
    return stack;
  }

  const next = change(above);

  return next === undefined ? stack : [...stack.slice(0, -1), next];
}

function slidBetween(sel: number, delta: number, most: number): number {
  const seated = Math.min(Math.max(sel, 0), Math.max(0, most));

  return Math.min(Math.max(0, most), Math.max(0, seated + delta));
}

export function mapWalked(stack: Frame[], name: string): Frame[] {
  return overTop(stack, (above) =>
    above.kind === 'map' ? { ...above, at: walkedIn(above.reading, above.at, name) } : undefined,
  );
}

export function mapSeated(stack: Frame[], at: number): Frame[] {
  return overTop(stack, (above) => (above.kind === 'map' ? { ...above, at } : undefined));
}

export function logSeated(stack: Frame[], at: number): Frame[] {
  return overTop(stack, (above) => (above.kind === 'oplog' ? { ...above, sel: at } : undefined));
}

export function logSlid(stack: Frame[], delta: number, most: number): Frame[] {
  return overTop(stack, (above) =>
    above.kind === 'oplog' ? { ...above, sel: slidBetween(above.sel, delta, most) } : undefined,
  );
}

export function docsSeated(stack: Frame[], at: number): Frame[] {
  return overTop(stack, (above) => (above.kind === 'docs' ? { ...above, sel: at } : undefined));
}

export function docsSlid(stack: Frame[], delta: number, most: number): Frame[] {
  return overTop(stack, (above) =>
    above.kind === 'docs' ? { ...above, sel: slidBetween(above.sel, delta, most) } : undefined,
  );
}

export function docsFocused(stack: Frame[], focus: DocsFocus): Frame[] {
  return overTop(stack, (above) => (above.kind === 'docs' ? { ...above, focus } : undefined));
}
