import { headingAnchors } from './skeleton.mts';

const SKELETON_LINK = /\]\((?:\.\/)?skeleton\.md#(?<anchor>[^)]+)\)/gu;

export function missingAnchors(intent: string, skeleton: string): string[] {
  const alive = new Set(headingAnchors(skeleton));
  const referenced = [...intent.matchAll(SKELETON_LINK)]
    .map((link) => link.groups?.['anchor'])
    .filter((anchor): anchor is string => anchor !== undefined);

  return [...new Set(referenced)].filter((anchor) => !alive.has(anchor));
}
