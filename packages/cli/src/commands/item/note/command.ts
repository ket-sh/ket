import { defineCommand } from 'citty';

import { record } from '../../../shared/event-log.ts';
import { read } from '../../../shared/item-store.ts';
import { ketRootOrThrow } from '../../../shared/locate.ts';

export const note = defineCommand({
  meta: { name: 'note', description: 'Say what is happening on an item right now' },
  args: {
    key: { type: 'positional', required: true, description: 'The item the note is about' },
    text: { type: 'positional', required: true, description: 'One line saying what is happening' },
    actor: { type: 'string', default: 'harness', description: 'Who is doing the work' },
  },
  async run({ args }) {
    const root = await ketRootOrThrow(process.cwd());

    await read(root, args.key);

    if (args.text.trim() === '') {
      throw new Error('a note says what is happening, and this one is empty');
    }

    await record(root, { note: args.text, actor: args.actor, item: args.key });
    process.stdout.write(`${args.key} noted\n`);
  },
});
