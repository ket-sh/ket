import { access } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative } from 'node:path';

import type { PresetName } from './configuration.ts';

import { PRESET_NAMES } from './configuration.ts';

export const KET_DIRECTORY = '.ket';

const SOURCE_DIRECTORY = 'src';

const REPOSITORY_ROOT = '.';

async function ketAt(directory: string): Promise<string | undefined> {
  return access(join(directory, KET_DIRECTORY)).then(
    () => directory,
    () => undefined,
  );
}

export async function ketRootFrom(start: string): Promise<string | undefined> {
  let walking = start;
  let found = await ketAt(walking);

  while (found === undefined) {
    const above = dirname(walking);

    if (above === walking) {
      return undefined;
    }

    walking = above;
    found = await ketAt(walking);
  }

  return found;
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

// A hook sends an absolute path, and every rule here is written against a path
// relative to the repository. Reading one as the other silently governs nothing.
export function insideRepository(root: string, path: string): string | undefined {
  if (!isAbsolute(path)) {
    return path;
  }

  const within = relative(root, path);

  return within.startsWith('..') ? undefined : within;
}

export function keyFrom(loaded: unknown): string | undefined {
  const exported = isRecord(loaded) ? loaded['default'] : undefined;
  const declared = isRecord(exported) ? exported['key'] : undefined;

  return typeof declared === 'string' && declared !== '' ? declared : undefined;
}

export function sourceRootsOf(targets: Record<string, PresetName>): string[] {
  return Object.keys(targets).map((directory) =>
    directory === REPOSITORY_ROOT ? SOURCE_DIRECTORY : `${directory}/${SOURCE_DIRECTORY}`,
  );
}
