import type { PresetName } from '../../shared/configuration.ts';

import { registeredPresets } from '../../shared/registry.ts';

export type ChosenPreset = { preset: PresetName } | { refused: string };

const WITHOUT_A_FLAG: PresetName = 'cli';

export function presetFrom(named: string | undefined): ChosenPreset {
  if (named === undefined) {
    return { preset: WITHOUT_A_FLAG };
  }

  const written = registeredPresets();
  const found = written.find((registered) => registered.name === named);

  if (found === undefined) {
    return {
      refused: `${named} is not a project type ket writes. It writes ${written.map((registered) => registered.name).join(', ')}`,
    };
  }

  return { preset: found.name };
}
