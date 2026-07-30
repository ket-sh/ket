import { adapterPatternsOf, CLI_SEMANTICS } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { spawn } from 'node:child_process';
import { appendFile, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';
import type { StoredItem } from '../../shared/read-item.ts';
import type { GovernedItem } from '../../shared/write-gate.ts';
import type { Denial } from './envelope.ts';
import type { GateEvent } from './event.ts';
import type { ProbeReply, RingFailure } from './ring.ts';

import { insideRepository, ketRootFrom, sourceRootsOf, targetsFrom } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { verdictFor } from '../../shared/write-gate.ts';
import { pathFrom, verdictReply } from './envelope.ts';
import { renderEvent } from './event.ts';
import { argvFor, probeReply } from './ring.ts';

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

interface GovernedFile {
  root: string;
  path: string;
}

// Nothing governs a repository ket never touched, or a file outside the one it
// does. Refusing either would block every write in every unrelated project the
// moment somebody enables the plugin at user scope.
async function governedFile(): Promise<GovernedFile | undefined> {
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

async function judgeWrite(): Promise<Denial | undefined> {
  const governed = await governedFile();

  if (governed === undefined) {
    return undefined;
  }

  const { root, path } = governed;
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

async function ran(argv: string[], root: string): Promise<string | undefined> {
  return new Promise((settle) => {
    const [binary, ...rest] = argv;
    const child = spawn(binary ?? '', rest, { cwd: root });
    let said = '';

    const gather = (chunk: Buffer): void => {
      said += chunk.toString();
    };

    child.stdout.on('data', gather);
    child.stderr.on('data', gather);
    child.on('error', (cause: Error) => {
      settle(cause.message);
    });

    child.on('close', (code) => {
      settle(code === 0 ? undefined : said.trim());
    });
  });
}

async function ringOne(root: string, path: string): Promise<RingFailure[]> {
  const failures: RingFailure[] = [];

  for (const check of CLI_SEMANTICS.rings.one) {
    const said = await ran(argvFor(check, path), root);

    if (said !== undefined) {
      failures.push({ runs: check.runs, said });
    }
  }

  return failures;
}

async function probeRing(): Promise<ProbeReply | undefined> {
  const governed = await governedFile();

  if (governed === undefined) {
    return undefined;
  }

  const { root, path } = governed;
  const failures = await ringOne(root, path);

  await record(root, {
    gate: 'probe',
    outcome: failures.length === 0 ? 'allowed' : 'refused',
    about: path,
  });

  return probeReply(failures);
}

const probe = defineCommand({
  meta: { name: 'probe', description: 'Run ring one over the file that was written' },
  async run() {
    const reply = await probeRing();

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
});

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
  subCommands: { write, probe },
});

export async function usage(): Promise<void> {
  await showUsage(gate);
}

export default gate;
