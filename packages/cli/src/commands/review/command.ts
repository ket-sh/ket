import { defineCommand, showUsage } from 'citty';

import { record } from '../../shared/event-log.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { reviewEventFor } from '../../shared/review.ts';

async function answer(key: string, reason: string | undefined): Promise<void> {
  const root = await ketRootOrThrow(process.cwd());
  const outcome = reviewEventFor({ key, reason });

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await record(root, outcome);
  process.stdout.write(`${key} ${outcome.outcome}\n`);
}

const recordReview = defineCommand({
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
  subCommands: { record: recordReview, skip },
});

export async function usage(): Promise<void> {
  await showUsage(review);
}

export default review;
