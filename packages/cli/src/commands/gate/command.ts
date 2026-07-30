import { adapterPatternsOf, CLI_PRESET, CLI_SEMANTICS, dependencyNamesOf } from '@ket/preset-cli';
import { defineCommand, showUsage } from 'citty';
import { spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Cited } from '../../shared/citations.ts';
import type { CitationReply } from './citations.ts';
import type { Denial } from './envelope.ts';
import type { ProposalReply } from './proposal.ts';
import type { ProbeReply, RingFailure } from './ring.ts';

import { ketRootFrom, sourceRootsOf } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { arrivalsIn, declaredIn, recordToolchain, seenIn } from '../../shared/toolchain.ts';
import { verdictFor, workingFrom } from '../../shared/write-gate.ts';
import { citationReply, pathsCitedIn, missingIn } from './citations.ts';
import {
  eventFor,
  governedFile,
  KET_DIRECTORY,
  keyOf,
  MANIFEST,
  readJson,
  readStored,
  readTargets,
  record,
  TOOLCHAIN,
} from './context.ts';
import { verdictReply } from './envelope.ts';
import { proposalReply } from './proposal.ts';
import { argvFor, probeReply } from './ring.ts';

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

  await record(root, eventFor(path, denial, keyOf(workingFrom(inFlight))));

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
  const governed = await governedFile();

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

const gate = defineCommand({
  meta: { name: 'gate', description: 'Run a pipeline gate' },
  subCommands: { write, probe, citations, toolchain },
});

export async function usage(): Promise<void> {
  await showUsage(gate);
}

export default gate;
