import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';

import { PRESET_NAMES } from '../../shared/configuration.ts';

const KET_DIRECTORY = '.ket';

const SOURCE_DIRECTORY = 'src';

const REPOSITORY_ROOT = '.';

async function holdsKet(directory: string): Promise<boolean> {
  return access(join(directory, KET_DIRECTORY)).then(
    () => true,
    () => false,
  );
}

export async function ketRootFrom(start: string): Promise<string | undefined> {
  let walking = start;

  while (!(await holdsKet(walking))) {
    const above = dirname(walking);

    if (above === walking) {
      return undefined;
    }

    walking = above;
  }

  return walking;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPreset(value: unknown): value is PresetName {
  return PRESET_NAMES.some((known) => known === value);
}

export function targetsFrom(loaded: unknown): Record<string, PresetName> {
  const exported = isRecord(loaded) ? loaded['default'] : undefined;
  const declared = isRecord(exported) ? exported['targets'] : undefined;

  if (!isRecord(declared)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(declared).filter((entry): entry is [string, PresetName] => isPreset(entry[1])),
  );
}

export function sourceRootsOf(targets: Record<string, PresetName>): string[] {
  return Object.keys(targets).map((directory) =>
    directory === REPOSITORY_ROOT ? SOURCE_DIRECTORY : `${directory}/${SOURCE_DIRECTORY}`,
  );
}
