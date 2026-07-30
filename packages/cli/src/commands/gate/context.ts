import { appendFile, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';
import type { StoredItem } from '../../shared/read-item.ts';
import type { GovernedItem } from '../../shared/write-gate.ts';
import type { Denial } from './envelope.ts';
import type { GateEvent } from './event.ts';

import { insideRepository, ketRootFrom, targetsFrom } from '../../shared/locate.ts';
import { pathFrom } from './envelope.ts';
import { renderEvent } from './event.ts';

export const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

const ITEM_FILE = 'item.yaml';

export const MANIFEST = 'package.json';

export const TOOLCHAIN = 'toolchain.json';

async function readEnvelope(): Promise<unknown> {
  const text = await new Response(process.stdin).text();

  if (text === '') {
    return undefined;
  }

  const parsed: unknown = JSON.parse(text);

  return parsed;
}

export async function readTargets(root: string): Promise<Record<string, PresetName>> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, 'config.ts'));

  return targetsFrom(loaded);
}

export async function readStored(root: string): Promise<StoredItem[]> {
  const items = join(root, KET_DIRECTORY, 'items');
  const entries = await readdir(items, { withFileTypes: true }).catch(() => []);
  const directories = entries.filter((entry) => entry.isDirectory());

  return Promise.all(
    directories.map(async (entry) => ({
      key: entry.name,
      contents: await readFile(join(items, entry.name, ITEM_FILE), 'utf8').catch(() => ''),
    })),
  );
}

export async function record(root: string, event: GateEvent): Promise<void> {
  await appendFile(join(root, KET_DIRECTORY, EVENTS), renderEvent(event), 'utf8');
}

export function eventFor(
  path: string,
  denial: Denial | undefined,
  item: string | undefined,
): GateEvent {
  if (denial === undefined) {
    return {
      gate: 'write',
      outcome: 'allowed',
      about: path,
      ...(item === undefined ? {} : { item }),
    };
  }

  return {
    gate: 'write',
    outcome: 'refused',
    about: path,
    ...(item === undefined ? {} : { item }),
    reason: denial.hookSpecificOutput.permissionDecisionReason,
  };
}

export function keyOf(working: GovernedItem[]): string | undefined {
  return working.length === 1 ? working[0]?.key : undefined;
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
export async function governedFile(): Promise<GovernedFile | undefined> {
  const written = pathFrom(await readEnvelope());

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

export async function readJson(path: string): Promise<unknown> {
  const text = await readFile(path, 'utf8').catch(() => '');

  try {
    const parsed: unknown = JSON.parse(text);

    return parsed;
  } catch {
    return undefined;
  }
}
