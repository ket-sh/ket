import { defineCommand } from 'citty';

import { greeting } from './greeting.ts';

export default defineCommand({
  meta: {
    name: 'hello',
    description: 'Greet someone, or the world',
  },
  args: {
    who: {
      type: 'positional',
      description: 'Who to greet',
      required: false,
    },
  },
  run({ args }) {
    console.log(greeting(args.who));
  },
});
