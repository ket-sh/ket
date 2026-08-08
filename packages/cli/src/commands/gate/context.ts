import type { PresetSemantics } from '@ket/preset';

import { readdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { parse } from 'yaml';

import type { PresetName } from '../../shared/configuration.ts';
import type { GateEvent } from '../../shared/event.ts';
import type { AdvisedSections } from '../../shared/toolchain.ts';
import type { Denial } from './envelope.ts';

import { configurationIn } from '../../shared/configuration-file.ts';
import { semanticsOf } from '../../shared/governing.ts';
import { insideRepository, ketRootFrom, sourceRootsOf } from '../../shared/locate.ts';
import { headingIn, seenUnder } from '../../shared/toolchain.ts';
import { pathFrom } from './envelope.ts';

export const KET_DIRECTORY = '.ket';

export const MANIFEST = 'package.json';

export const TOOLCHAIN = 'toolchain.yaml';

export function envelopeFrom(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function readEnvelope(): Promise<unknown> {
  return envelopeFrom(await text(process.stdin));
}

async function readTargets(root: string): Promise<Record<string, PresetName>> {
  const reading = await configurationIn(root);

  return 'configuration' in reading ? reading.configuration.targets : {};
}

export async function sourcesOf(root: string): Promise<string[]> {
  return sourceRootsOf(await readTargets(root));
}

export interface GovernedWrite {
  root: string;
  path: string;
  semantics: PresetSemantics;
}

// A gate cannot judge a write without the file it touched and the preset that
// governs the project. Either one missing says the same thing: nothing here is
// ket's to answer for.
export async function governedWrite(): Promise<GovernedWrite | undefined> {
  const governed = await governedFile(await readEnvelope());

  if (governed === undefined) {
    return undefined;
  }

  const semantics = await semanticsOf(governed.root);

  return semantics === undefined ? undefined : { ...governed, semantics };
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

const ADR_ROOTS = [join(KET_DIRECTORY, 'items'), join('docs', 'adr')];

async function markdownUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true }).catch(
    () => [],
  );

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export async function adrTitlesUnder(root: string): Promise<string[]> {
  const found = await Promise.all(ADR_ROOTS.map(async (sub) => markdownUnder(join(root, sub))));
  const bodies = await Promise.all(
    found.flat().map(async (path) => readFile(path, 'utf8').catch(() => '')),
  );

  return bodies.map(headingIn).filter((title): title is string => title !== undefined);
}

function heldIn(source: string): unknown {
  try {
    const held: unknown = parse(source);

    return held;
  } catch {
    return undefined;
  }
}

export async function readAdvised(root: string): Promise<AdvisedSections> {
  const source = await readFile(join(root, KET_DIRECTORY, TOOLCHAIN), 'utf8').catch(() => '');
  const held = heldIn(source);

  return {
    dependencies: seenUnder(held, 'dependencies'),
    decisions: seenUnder(held, 'decisions'),
    kinds: seenUnder(held, 'kinds'),
  };
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
