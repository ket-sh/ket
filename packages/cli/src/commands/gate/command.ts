import { adapterPatternsOf, CLI_SEMANTICS } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { appendFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';
import type { StoredItem } from '../../shared/read-item.ts';
import type { GovernedItem } from '../../shared/write-gate.ts';
import type { Denial } from './envelope.ts';
import type { GateEvent } from './event.ts';

import { inFlightFrom } from '../../shared/read-item.ts';
import { verdictFor } from '../../shared/write-gate.ts';
import { pathFrom, refusal, verdictReply } from './envelope.ts';
import { renderEvent } from './event.ts';
import { ketRootFrom, sourceRootsOf, targetsFrom } from './locate.ts';

const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

const ITEM_FILE = 'item.yaml';

async function readEnvelope(): Promise<unknown> {
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

async function readStored(root: string): Promise<StoredItem[]> {
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

async function record(root: string, event: GateEvent): Promise<void> {
  await appendFile(join(root, KET_DIRECTORY, EVENTS), renderEvent(event), 'utf8');
}

function eventFor(path: string, denial: Denial | undefined, item: string | undefined): GateEvent {
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

function keyOf(inFlight: GovernedItem[]): string | undefined {
  return inFlight.length === 1 ? inFlight[0]?.key : undefined;
}

async function judgeWrite(): Promise<Denial | undefined> {
  const envelope = await readEnvelope();
  const path = pathFrom(envelope);

  if (path === undefined) {
    return undefined;
  }

  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return refusal(
      `no ${KET_DIRECTORY} directory above ${process.cwd()}, so nothing governs ${path}`,
    );
  }

  const inFlight = inFlightFrom(await readStored(root));
  const denial = verdictReply(
    verdictFor({
      path,
      sources: sourceRootsOf(await readTargets(root)),
      adapters: adapterPatternsOf(CLI_SEMANTICS),
      inFlight,
    }),
  );

  await record(root, eventFor(path, denial, keyOf(inFlight)));

  return denial;
}

const write = defineCommand({
  meta: { name: 'write', description: 'Decide whether an item permits this write' },
  async run() {
    const denial = await judgeWrite();

    if (denial !== undefined) {
      process.stdout.write(JSON.stringify(denial));
    }
  },
});

const gate = defineCommand({
  meta: { name: 'gate', description: 'Run a pipeline gate' },
  subCommands: { write },
});

export async function usage(): Promise<void> {
  await showUsage(gate);
}

export default gate;
