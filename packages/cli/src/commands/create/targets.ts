import type { PresetName } from '../../shared/configuration.ts';

import { PRESET_NAMES } from '../../shared/configuration.ts';

export type TargetOutcome = { added: Record<string, PresetName> } | { refused: string };

function knownPreset(preset: string): PresetName | undefined {
  return PRESET_NAMES.find((name) => name === preset);
}

function reachesOutside(directory: string): boolean {
  return directory.startsWith('/') || directory.split('/').includes('..');
}

export function refuseDirectory(
  gathered: Record<string, PresetName>,
  directory: string,
): string | undefined {
  if (directory === '') {
    return 'a target needs a directory';
  }

  if (reachesOutside(directory)) {
    return `${directory} reaches outside the repository`;
  }

  return directory in gathered ? `${directory} already has a preset` : undefined;
}

export function addTarget(
  gathered: Record<string, PresetName>,
  directory: string,
  preset: string,
): TargetOutcome {
  const refused = refuseDirectory(gathered, directory);

  if (refused !== undefined) {
    return { refused };
  }

  const known = knownPreset(preset);

  return known === undefined
    ? { refused: `ket ships no preset named ${preset}` }
    : { added: { ...gathered, [directory]: known } };
}
