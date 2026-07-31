import { defineCommand, showUsage } from 'citty';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { renderEvent } from '../../shared/event.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { reviewEventFor } from '../../shared/review.ts';

const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

async function answer(key: string, reason: string | undefined): Promise<void> {
  const root = await ketRootOrThrow(process.cwd());
  const outcome = reviewEventFor({ key, reason });

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await appendFile(join(root, KET_DIRECTORY, EVENTS), renderEvent(outcome), 'utf8');
  process.stdout.write(`${key} ${outcome.outcome}\n`);
}

const record = defineCommand({
  meta: { name: 'record', description: 'Record that a review answered for an item' },
  args: {
    key: { type: 'positional', required: true, description: 'The item the review answered for' },
  },
  async run({ args }) {
    await answer(args.key, undefined);
  },
});

const skip = defineCommand({
  meta: { name: 'skip', description: 'Record a deliberate skip, with the reason for it' },
  args: {
    key: { type: 'positional', required: true, description: 'The item going out unreviewed' },
    reason: { type: 'string', required: true, description: 'What made it safe to skip' },
  },
  async run({ args }) {
    await answer(args.key, args.reason);
  },
});

const review = defineCommand({
  meta: { name: 'review', description: 'Answer for an item before it goes out' },
  subCommands: { record, skip },
});

export async function usage(): Promise<void> {
  await showUsage(review);
}

export default review;
