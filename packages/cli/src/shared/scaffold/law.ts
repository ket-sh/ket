import type { ScaffoldFile } from '../../shared/write-files.ts';

const STANDING_LAW = 'CLAUDE.md';

const PLAIN_LAW = 'CLAUDE.plain.md';

export function keepingTheStandingLaw(installed: ScaffoldFile[]): ScaffoldFile[] {
  return installed.filter((file) => file.path !== PLAIN_LAW);
}

export function landingThePlainLaw(installed: ScaffoldFile[]): ScaffoldFile[] {
  return installed
    .filter((file) => file.path !== STANDING_LAW)
    .map((file) => (file.path === PLAIN_LAW ? { ...file, path: STANDING_LAW } : file));
}
