import { defineCommand } from 'citty';

export const commands = {
  init: async () => (await import('./commands/init/command.ts')).default,
  watch: async () => (await import('./commands/watch/command.ts')).default,
};

export const main = defineCommand({
  meta: {
    name: 'ket',
    description: 'Configure a repository for ket, and watch the pipeline run',
  },
  subCommands: commands,
});
