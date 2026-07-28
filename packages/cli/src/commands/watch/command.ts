import { defineCommand } from 'citty';

import { COMMAND_ARGS } from '../../shared/args.ts';

export default defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch the pipeline as it runs',
  },
  args: COMMAND_ARGS,
  run() {
    throw new Error('the watch view is not built yet');
  },
});
