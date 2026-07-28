import { defineCommand } from 'citty';

export default defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch the pipeline as it runs',
  },
  run() {
    throw new Error('the watch view is not built yet');
  },
});
