import { adapterPatternsOf, coveringTestsOf, dependencyNamesOf, ringOneOf } from '@ket/preset';
import { CLI_PRESET, CLI_SEMANTICS } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PlannedCheck } from '../../shared/checks.ts';
import type { Cited } from '../../shared/citations.ts';
import type { RingFailure } from '../../shared/ring.ts';
import type { CitationReply } from './citations.ts';
import type { Denial } from './envelope.ts';
import type { ProposalReply } from './proposal.ts';
import type { ProbeReply } from './ring.ts';

import { failuresAmong } from '../../shared/checks.ts';
import { record } from '../../shared/event-log.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { argvFor } from '../../shared/ring.ts';
import { arrivalsIn, declaredIn, recordToolchain, seenIn } from '../../shared/toolchain.ts';
import { jobIn, verdictFor } from '../../shared/write-gate.ts';
import { citationReply, pathsCitedIn, missingIn } from './citations.ts';
import {
  eventFor,
  governedFile,
  KET_DIRECTORY,
  MANIFEST,
  readEnvelope,
  readJson,
  sourcesOf,
  TOOLCHAIN,
} from './context.ts';
import { verdictReply } from './envelope.ts';
import { proposalReply } from './proposal.ts';
import { probeReply } from './ring.ts';
import { judgeCommand } from './shell.ts';
import { askTestFirst } from './test-first.ts';
import { judgeStop } from './turn.ts';

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

  await record(root, eventFor('write', path, denial, jobIn(inFlight)?.key));

  return denial;
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
  const planned = ringOneOf(CLI_SEMANTICS).flatMap((check): PlannedCheck[] => {
    const argv = argvFor(check, covering, path);

    return argv === undefined ? [] : [{ runs: check.runs, argv }];
  });

  return failuresAmong(root, planned);
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

// A cited directory is not a missing citation. It exists, it just holds no
// contents a symbol could live in.
async function reads(root: string, path: string): Promise<Cited> {
  const contents = await readFile(join(root, path), 'utf8').catch(() => undefined);

  if (contents !== undefined) {
    return { path, contents };
  }

  const reachable = await access(join(root, path)).then(
    () => true,
    () => false,
  );

  return reachable ? { path, contents: '' } : { path, missing: true };
}

// A design artifact names paths and symbols and claims the repository has them.
// Only what an item wrote is checked, because a README naming a file ket has not
// built yet is a plan, not a claim.
const DESIGNS = '.ket/items/';

async function checkCitations(): Promise<CitationReply | undefined> {
  const governed = await governedFile(await readEnvelope());

  if (
    governed === undefined ||
    !governed.path.startsWith(DESIGNS) ||
    !governed.path.endsWith('.md')
  ) {
    return undefined;
  }

  const { root, path } = governed;
  const markdown = await readFile(join(root, path), 'utf8').catch(() => '');
  const read = await Promise.all(pathsCitedIn(markdown).map(async (cited) => reads(root, cited)));
  const missing = missingIn(markdown, read);

  await record(root, {
    gate: 'citations',
    outcome: missing.length === 0 ? 'allowed' : 'refused',
    about: path,
  });

  return citationReply(missing);
}

const citations = defineCommand({
  meta: {
    name: 'citations',
    description: 'Check what a design artifact claims the repository has',
  },
  async run() {
    const reply = await checkCitations();

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
});

// A dependency ket installed carries the checks ket already runs, so only what
// arrived after it is worth a proposal. The record is written when the gate
// answers, and never otherwise, so a name is put to a session once.
async function lookAtToolchain(): Promise<ProposalReply | undefined> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const record = join(root, KET_DIRECTORY, TOOLCHAIN);
  const seen = seenIn(await readJson(record));
  const arrivals = arrivalsIn({
    declared: declaredIn(await readJson(join(root, MANIFEST))),
    shipped: dependencyNamesOf(CLI_PRESET),
    seen,
  });
  const reply = proposalReply(arrivals);

  if (reply === undefined) {
    return undefined;
  }

  await writeFile(record, recordToolchain([...seen, ...arrivals]), 'utf8');

  return reply;
}

const toolchain = defineCommand({
  meta: { name: 'toolchain', description: 'Name what arrived since ket last looked' },
  async run() {
    const reply = await lookAtToolchain();

    if (reply !== undefined) {
      process.stdout.write(JSON.stringify(reply));
    }
  },
});

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

const shell = defineCommand({
  meta: { name: 'shell', description: 'Decide whether a command may skip a gate' },
  async run() {
    const denial = await judgeCommand();

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

// Exit 2 is what keeps the agent working and stderr is what reaches it. The
// code is set rather than the process ended, so nothing written here is lost.
const turn = defineCommand({
  meta: { name: 'turn', description: 'Decide whether the session may stop here' },
  async run() {
    const refusal = await judgeStop();

    if (refusal !== undefined) {
      process.stderr.write(`${refusal}\n`);
      process.exitCode = 2;
    }
  },
});

const gate = defineCommand({
  meta: { name: 'gate', description: 'Run a pipeline gate' },
  subCommands: { write, probe, shell, citations, toolchain, turn, 'test-first': testFirst },
});

export async function usage(): Promise<void> {
  await showUsage(gate);
}

export default gate;
