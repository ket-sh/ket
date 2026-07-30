import { defineCommand } from 'citty';

export const main = defineCommand({
  meta: {
    name: '__PROJECT_NAME__',
    description: 'A command line application under ket',
  },
  subCommands: {
    hello: async () => (await import('./commands/hello/command.ts')).default,
  },
});
