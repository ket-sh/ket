import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

import { ketRootFrom } from '../../shared/locate.ts';
import { actingTranscript, pointedAt, refusal } from './envelope.ts';
import { eventFor, record } from './journal.ts';

const TEST_FIRST = './node_modules/.bin/probity';

const TEST_FIRST_ARGV = ['--agent', 'claude-code'];

const UNRESOLVED =
  'the test-first gate could not tell which conversation this write came from, so it refused rather than judge it against another one.';

const UNAVAILABLE = 'the test-first gate could not start';

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

async function reachable(envelope: unknown): Promise<string | undefined> {
  const acting = actingTranscript(envelope);

  if (acting === undefined) {
    return undefined;
  }

  return access(acting).then(
    () => acting,
    () => undefined,
  );
}

// ket records what ket decided. A refusal the test-first gate wrote is its own,
// and it reaches the agent in its own words rather than through a second voice.
interface Refused {
  root: string;
  about: string | undefined;
  reason: string;
}

async function refusedHere(refused: Refused): Promise<string> {
  const denial = refusal(refused.reason);

  if (refused.about !== undefined) {
    await record(refused.root, eventFor('test-first', refused.about, denial));
  }

  return JSON.stringify(denial);
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

  const transcript = await reachable(envelope);

  if (transcript === undefined) {
    return refusedHere({ root, about, reason: UNRESOLVED });
  }

  const answer = await asked(root, pointedAt(envelope, transcript));

  if (answer.started) {
    return answer.said === '' ? undefined : answer.said;
  }

  return refusedHere({ root, about, reason: `${UNAVAILABLE}: ${answer.said}` });
}
