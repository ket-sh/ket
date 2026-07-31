import type { PresetItem, PresetSemantics } from '@ket/preset';

import { join } from 'node:path';

import type { RegisteredPreset } from './registry.ts';

import { KET_DIRECTORY, targetsFrom } from './locate.ts';
import { governingPresets } from './registry.ts';

const CONFIG = 'config.ts';

// A project says which preset governs it, and every rule ket applies belongs to
// that preset. Reading one preset for every project is how a frontend ends up
// measured against the layout of a command line.
async function governingOf(root: string): Promise<RegisteredPreset | undefined> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, CONFIG));
  const [governing] = governingPresets(Object.values(targetsFrom(loaded)));

  return governing;
}

export async function semanticsOf(root: string): Promise<PresetSemantics | undefined> {
  return (await governingOf(root))?.semantics;
}

export async function presetOf(root: string): Promise<PresetItem | undefined> {
  return (await governingOf(root))?.item;
}
