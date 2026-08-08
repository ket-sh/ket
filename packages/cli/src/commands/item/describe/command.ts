import { defineCommand } from 'citty';

import { ketRootOrThrow } from '../../../shared/locate.ts';
import { read, write } from '../store.ts';
import { proseFrom } from './prose.ts';
import { redescribing } from './redescribe.ts';

export const describeItem = defineCommand({
  meta: { name: 'describe', description: 'Fill or replace the description a filed item carries' },
  args: {
    key: { type: 'positional', required: true, description: 'The item to describe' },
    description: { type: 'string', description: 'The prose to store' },
    file: { type: 'string', description: 'A file holding the prose to store' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());
    const item = await read(root, args.key);
    const reading = await proseFrom(args, process.stdin);

    if ('refused' in reading) {
      throw new Error(`${args.key} is not described: ${reading.refused}`);
    }

    const outcome = redescribing(item, reading.prose);

    if ('refused' in outcome) {
      throw new Error(`${args.key} is not described: ${outcome.refused}`);
    }

    await write(root, args.key, outcome.described);
    process.stdout.write(`${args.key} described\n`);
  },
});
