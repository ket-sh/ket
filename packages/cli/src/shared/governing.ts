import type { PresetItem, PresetSemantics } from '@ket/preset';

import type { RegisteredPreset } from './registry.ts';

import { configurationIn } from './configuration-file.ts';
import { governingPresets } from './registry.ts';

// A project says which preset governs it, and every rule ket applies belongs to
// that preset. Reading one preset for every project is how a frontend ends up
// measured against the layout of a command line.
async function governingOf(root: string): Promise<RegisteredPreset | undefined> {
  const reading = await configurationIn(root);

  if (!('configuration' in reading)) {
    return undefined;
  }

  const [governing] = governingPresets(Object.values(reading.configuration.targets));

  return governing;
}

export async function semanticsOf(root: string): Promise<PresetSemantics | undefined> {
  return (await governingOf(root))?.semantics;
}

export async function presetOf(root: string): Promise<PresetItem | undefined> {
  return (await governingOf(root))?.item;
}
