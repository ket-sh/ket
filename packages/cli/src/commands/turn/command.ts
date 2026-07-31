import { defineCommand, showUsage } from 'citty';

import { record } from '../../shared/event-log.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { restEventFor } from '../../shared/rest.ts';
import { jobIn } from '../../shared/write-gate.ts';

const rest = defineCommand({
  meta: { name: 'rest', description: 'Record a deliberate stop, with the reason for it' },
  args: {
    key: { type: 'positional', required: true, description: 'The item the session stops on' },
    reason: { type: 'string', required: true, description: 'What the work is waiting on' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const outcome = restEventFor({
      key: args.key,
      reason: args.reason,
      job: jobIn(inFlightFrom(await readStored(root))),
    });

    if ('refused' in outcome) {
      throw new Error(outcome.refused);
    }

    await record(root, outcome);
    process.stdout.write(`${args.key} rested\n`);
  },
});

const turn = defineCommand({
  meta: { name: 'turn', description: 'Answer for a turn the pipeline is not done with' },
  subCommands: { rest },
});

export async function usage(): Promise<void> {
  await showUsage(turn);
}

export default turn;
