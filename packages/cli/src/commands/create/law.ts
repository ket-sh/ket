import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

const STANDING_LAW = 'CLAUDE.md';

const PLAIN_LAW = 'CLAUDE.plain.md';

function keepingTheStandingLaw(installed: ScaffoldFile[]): ScaffoldFile[] {
  return installed.filter((file) => file.path !== PLAIN_LAW);
}

function landingThePlainLaw(installed: ScaffoldFile[]): ScaffoldFile[] {
  return installed
    .filter((file) => file.path !== STANDING_LAW)
    .map((file) => (file.path === PLAIN_LAW ? { ...file, path: STANDING_LAW } : file));
}

export function withChosenLaw(
  installed: ScaffoldFile[],
  configuration: Configuration,
): ScaffoldFile[] {
  return configuration.workflow ? keepingTheStandingLaw(installed) : landingThePlainLaw(installed);
}
