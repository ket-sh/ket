import { adapterPatternsOf, CLI_SEMANTICS, coveringTestsOf, ringOneOf } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { spawn } from 'node:child_process';
import { access, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { PresetName } from '../../shared/configuration.ts';
import type { StoredItem } from '../../shared/read-item.ts';
import type { GovernedItem } from '../../shared/write-gate.ts';
import type { Denial } from './envelope.ts';
import type { ProbeReply, RingFailure } from './ring.ts';

import {
  insideRepository,
  KET_DIRECTORY,
  ketRootFrom,
  sourceRootsOf,
  targetsFrom,
} from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { shellVerdict } from '../../shared/shell-gate.ts';
import { verdictFor, workingFrom } from '../../shared/write-gate.ts';
import { commandFrom, pathFrom, verdictReply } from './envelope.ts';
import { eventFor, record } from './journal.ts';
import { argvFor, probeReply } from './ring.ts';
import { askTestFirst } from './test-first.ts';

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

function keyOf(working: GovernedItem[]): string | undefined {
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

interface GovernedFile {
  root: string;
  path: string;
}

// Nothing governs a repository ket never touched, or a file outside the one it
// does. Refusing either would block every write in every unrelated project the
// moment somebody enables the plugin at user scope.
async function governedFile(envelope: unknown): Promise<GovernedFile | undefined> {
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

async function judgeWrite(): Promise<Denial | undefined> {
  const governed = await governedFile(await readEnvelope());

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
      lockfile: CLI_SEMANTICS.lockfile,
      inFlight,
    }),
  );

  await record(root, eventFor('write', path, denial, keyOf(workingFrom(inFlight))));

  return denial;
}

// A command carries no path, so nothing about it is inside or outside the
// repository. What decides is the same thing that decides for a write: ket
// governs the repository it was told about, and nothing else.
async function judgeCommand(): Promise<Denial | undefined> {
  const command = commandFrom(await readEnvelope());

  if (command === undefined) {
    return undefined;
  }

  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const denial = verdictReply(shellVerdict(command));

  await record(root, eventFor('shell', command, denial));

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

// The tests a preset names after a unit are the ones that cover it, and the ones
// that are not there yet are the test-first gate's business rather than ring
// one's. Absolute, so the runner matches the file rather than a pattern.
async function coveringOn(root: string, path: string): Promise<string[]> {
  const named = coveringTestsOf(CLI_SEMANTICS, path).map((test) => join(root, test));
  const found = await Promise.all(
    named.map(async (test) =>
      access(test).then(
        () => test,
        () => undefined,
      ),
    ),
  );

  return found.filter((test): test is string => test !== undefined);
}

async function ringOne(root: string, path: string): Promise<RingFailure[]> {
  const covering = await coveringOn(root, path);
  const failures: RingFailure[] = [];

  for (const check of ringOneOf(CLI_SEMANTICS)) {
    const argv = argvFor(check, covering, path);
    const said = argv === undefined ? undefined : await ran(argv, root);

    if (said !== undefined) {
      failures.push({ runs: check.runs, said });
    }
  }

  return failures;
}

async function probeRing(): Promise<ProbeReply | undefined> {
  const governed = await governedFile(await readEnvelope());

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

const testFirst = defineCommand({
  meta: { name: 'test-first', description: 'Ask the test-first gate whether this write is earned' },
  async run() {
    const envelope = await readEnvelope();
    const said = await askTestFirst(envelope, (await governedFile(envelope))?.path);

    if (said !== undefined) {
      process.stdout.write(said);
    }
  },
});

const shell = defineCommand({
  meta: { name: 'shell', description: 'Decide whether a command may skip a gate' },
  async run() {
    const denial = await judgeCommand();

    if (denial !== undefined) {
      process.stdout.write(JSON.stringify(denial));
    }
  },
});

const gate = defineCommand({
  meta: { name: 'gate', description: 'Run a pipeline gate' },
  subCommands: { write, probe, shell, 'test-first': testFirst },
});

export async function usage(): Promise<void> {
  await showUsage(gate);
}

export default gate;
