import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';
import type { GateEvent } from '../../shared/event.ts';
import type { Denial } from './envelope.ts';

import { insideRepository, ketRootFrom, sourceRootsOf, targetsFrom } from '../../shared/locate.ts';
import { pathFrom } from './envelope.ts';

export const KET_DIRECTORY = '.ket';

export const MANIFEST = 'package.json';

export const TOOLCHAIN = 'toolchain.json';

export async function readEnvelope(): Promise<unknown> {
  const text = await new Response(process.stdin).text();

  if (text === '') {
    return undefined;
  }

  const parsed: unknown = JSON.parse(text);

  return parsed;
}

async function readTargets(root: string): Promise<Record<string, PresetName>> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, 'config.ts'));

  return targetsFrom(loaded);
}

export async function sourcesOf(root: string): Promise<string[]> {
  return sourceRootsOf(await readTargets(root));
}

export function eventFor(
  gate: GateEvent['gate'],
  about: string,
  denial: Denial | undefined,
  item?: string,
): GateEvent {
  return {
    gate,
    outcome: denial === undefined ? 'allowed' : 'refused',
    about,
    ...(item === undefined ? {} : { item }),
    ...(denial === undefined ? {} : { reason: denial.hookSpecificOutput.permissionDecisionReason }),
  };
}

// A repository reached through a symlink names its files one way and reports its
// working directory another, and the two have to meet before anything compares
// them. The written file does not exist yet, so the nearest ancestor that does
// is what can be resolved.
async function settled(path: string): Promise<string> {
  const found = await realpath(path).catch(() => undefined);

  if (found !== undefined) {
    return found;
  }

  const parent = dirname(path);

  return parent === path ? path : join(await settled(parent), basename(path));
}

export interface GovernedFile {
  root: string;
  path: string;
}

// Nothing governs a repository ket never touched, or a file outside the one it
// does. Refusing either would block every write in every unrelated project the
// moment somebody enables the plugin at user scope.
export async function governedFile(envelope: unknown): Promise<GovernedFile | undefined> {
  const written = pathFrom(envelope);

  if (written === undefined) {
    return undefined;
  }

  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const path = insideRepository(root, await settled(written));

  return path === undefined ? undefined : { root, path };
}

// A path a command names is resolved the way a written path is, or a repository
// reached through a symlink governs nothing a shell does inside it.
export async function governedPaths(root: string, named: string[]): Promise<string[]> {
  const settledPaths = await Promise.all(named.map(async (path) => settled(resolve(root, path))));

  return settledPaths
    .map((path) => insideRepository(root, path))
    .filter((path): path is string => path !== undefined);
}

export async function readJson(path: string): Promise<unknown> {
  const text = await readFile(path, 'utf8').catch(() => '');

  try {
    const parsed: unknown = JSON.parse(text);

    return parsed;
  } catch {
    return undefined;
  }
}
