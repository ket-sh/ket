import { adapterPatternsOf } from '@ket/preset';
import { CLI_SEMANTICS } from '@ket/preset-cli';

import type { Verdict } from '../../shared/verdict.ts';
import type { Denial } from './envelope.ts';

import { writesOf } from '../../shared/command-writes.ts';
import { readLog, record } from '../../shared/event-log.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { reviewedIn } from '../../shared/reviewed.ts';
import { shellVerdict, unreadableVerdict } from '../../shared/shell-gate.ts';
import { eventFor, governedPaths, readEnvelope, sourcesOf } from './context.ts';
import { commandFrom, verdictReply } from './envelope.ts';

async function commandVerdict(root: string, command: string): Promise<Verdict> {
  const writes = writesOf(command);

  if ('unreadable' in writes) {
    return unreadableVerdict(writes.unreadable);
  }

  return shellVerdict({
    command,
    written: await governedPaths(root, writes.paths),
    sources: await sourcesOf(root),
    adapters: adapterPatternsOf(CLI_SEMANTICS),
    lockfile: CLI_SEMANTICS.lockfile,
    inFlight: inFlightFrom(await readStored(root)),
    reviewed: reviewedIn(await readLog(root)),
  });
}

// A shell writes the same files the Write tool does, so a gate that reads only
// one of the two is a gate an agent steps around with a redirect.
export async function judgeCommand(): Promise<Denial | undefined> {
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
