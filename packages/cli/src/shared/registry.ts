import type { PresetItem, PresetSemantics } from '@ket/preset';

import { CLI_PRESET, CLI_SEMANTICS, contentOf as cliContentOf } from '@ket/preset-cli';
import { WEB_PRESET, WEB_SEMANTICS, contentOf as webContentOf } from '@ket/preset-web';

import type { PresetName } from './configuration.ts';

export interface RegisteredPreset {
  name: PresetName;
  item: PresetItem;
  semantics: PresetSemantics;
  contentOf: (path: string) => string;
}

// A target names a preset, and a preset is the item it writes, the semantics
// that govern what it wrote, and the bytes behind both. Splitting the three
// across the commands that need them is what let a config drift from a gate.
const REGISTERED: RegisteredPreset[] = [
  { name: 'cli', item: CLI_PRESET, semantics: CLI_SEMANTICS, contentOf: cliContentOf },
  { name: 'web', item: WEB_PRESET, semantics: WEB_SEMANTICS, contentOf: webContentOf },
];

export function registeredPresets(): RegisteredPreset[] {
  return REGISTERED;
}

export function presetNamed(name: PresetName): RegisteredPreset | undefined {
  return REGISTERED.find((registered) => registered.name === name);
}

// A target ket has yet to write a preset for governs nothing, and dropping it
// here is what keeps every caller downstream free of the question.
export function governingPresets(targets: PresetName[]): RegisteredPreset[] {
  return [...new Set(targets)]
    .map(presetNamed)
    .filter((registered): registered is RegisteredPreset => registered !== undefined);
}
