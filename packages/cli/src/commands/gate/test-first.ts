import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

import type { Denial } from './envelope.ts';

import { ketRootFrom } from '../../shared/locate.ts';
import { actingTranscript, pointedAt, refusal } from './envelope.ts';
import { eventFor, record } from './journal.ts';

const TEST_FIRST = './node_modules/.bin/probity';

const TEST_FIRST_ARGV = ['--agent', 'claude-code'];

const UNRESOLVED =
  'the test-first gate could not tell which conversation this write came from, so it refused rather than judge it against another one.';

const UNREADABLE = 'the test-first gate found no transcript for the agent that acted, at';

const UNAVAILABLE = 'the test-first gate could not start';

const JUDGED = 'the test-first gate refused, judged against';

interface GateAnswer {
  started: boolean;
  said: string;
}

async function asked(root: string, envelope: string): Promise<GateAnswer> {
  return new Promise((settle) => {
    const child = spawn(TEST_FIRST, TEST_FIRST_ARGV, { cwd: root });
    let answered = '';
    let complained = '';

    child.stdout.on('data', (chunk: Buffer) => {
      answered += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      complained += chunk.toString();
    });
    child.on('error', (cause: Error) => {
      settle({ started: false, said: cause.message });
    });
    child.on('close', (code) => {
      settle(
        code === 0
          ? { started: true, said: answered }
          : { started: false, said: complained.trim() },
      );
    });

    child.stdin.end(envelope);
  });
}

// A gate that reads the wrong conversation answers confidently about work
// nobody did, so what it could not resolve is what the refusal has to name.
async function reachable(acting: string | undefined): Promise<string | { missing: string }> {
  if (acting === undefined) {
    return { missing: UNRESOLVED };
  }

  return access(acting).then(
    () => acting,
    () => ({ missing: `${UNREADABLE} ${acting}.` }),
  );
}

// ket records what ket decided. A refusal the test-first gate wrote is its own,
// and it reaches the agent in its own words rather than through a second voice.
interface Refused {
  root: string;
  about: string | undefined;
  reason: string;
}

async function recorded(refused: Refused): Promise<Denial> {
  const denial = refusal(refused.reason);

  if (refused.about !== undefined) {
    await record(refused.root, eventFor('test-first', refused.about, denial));
  }

  return denial;
}

async function refusedHere(refused: Refused): Promise<string> {
  return JSON.stringify(await recorded(refused));
}

// A gate that cannot run has to refuse. Any other answer lets the write through,
// so a project that never installed the gate it declares would silently lose it.
export async function askTestFirst(
  envelope: unknown,
  about: string | undefined,
): Promise<string | undefined> {
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const transcript = await reachable(actingTranscript(envelope));

  if (typeof transcript !== 'string') {
    return refusedHere({ root, about, reason: transcript.missing });
  }

  const answer = await asked(root, pointedAt(envelope, transcript));

  if (!answer.started) {
    return refusedHere({ root, about, reason: `${UNAVAILABLE}: ${answer.said}` });
  }

  if (answer.said === '') {
    return undefined;
  }

  // The refusal reaching the agent is the gate's own words. What ket records is
  // ket's part in it: which conversation it handed the gate to judge.
  await recorded({ root, about, reason: `${JUDGED} ${transcript}.` });

  return answer.said;
}
