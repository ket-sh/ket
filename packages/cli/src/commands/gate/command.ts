import { adapterPatternsOf, CLI_SEMANTICS, coveringTestsOf, ringOneOf } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';

import type { Verdict } from '../../shared/verdict.ts';
import type { GovernedItem } from '../../shared/write-gate.ts';
import type { Denial } from './envelope.ts';
import type { ProbeReply, RingFailure } from './ring.ts';

import { writesOf } from '../../shared/command-writes.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { shellVerdict, unreadableVerdict } from '../../shared/shell-gate.ts';
import { verdictFor, workingFrom } from '../../shared/write-gate.ts';
import { commandFrom, verdictReply } from './envelope.ts';
import { governedFile, governedPaths, readEnvelope, readStored, sourcesOf } from './governed.ts';
import { eventFor, record } from './journal.ts';
import { argvFor, probeReply } from './ring.ts';
import { askTestFirst } from './test-first.ts';

function keyOf(working: GovernedItem[]): string | undefined {
  return working.length === 1 ? working[0]?.key : undefined;
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
      sources: await sourcesOf(root),
      adapters: adapterPatternsOf(CLI_SEMANTICS),
      lockfile: CLI_SEMANTICS.lockfile,
      inFlight,
    }),
  );

  await record(root, eventFor('write', path, denial, keyOf(workingFrom(inFlight))));

  return denial;
}

async function commandVerdict(root: string, command: string): Promise<Verdict> {
  const writes = writesOf(command);

  if ('unreadable' in writes) {
    return unreadableVerdict(writes.unreadable);
  }

  const inFlight = inFlightFrom(await readStored(root));

  return shellVerdict({
    command,
    written: await governedPaths(root, writes.paths),
    sources: await sourcesOf(root),
    adapters: adapterPatternsOf(CLI_SEMANTICS),
    lockfile: CLI_SEMANTICS.lockfile,
    inFlight,
  });
}

// A shell writes the same files the Write tool does, so a gate that reads only
// one of the two is a gate an agent steps around with a redirect.
async function judgeCommand(): Promise<Denial | undefined> {
  const command = commandFrom(await readEnvelope());

  if (command === undefined) {
    return undefined;
  }

  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const denial = verdictReply(await commandVerdict(root, command));

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
