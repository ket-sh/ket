import { defineCommand } from 'citty';

const load = {
  create: async () => import('./commands/create/command.ts'),
  watch: async () => import('./commands/watch/command.ts'),
};

export const commands = {
  create: async () => (await load.create()).default,
  watch: async () => (await load.watch()).default,
};

export async function showUsageOf(name: keyof typeof load): Promise<void> {
  await (await load[name]()).usage();
}

export const main = defineCommand({
  meta: {
    name: 'ket',
    description: 'Create a project under ket, and watch the pipeline run',
  },
  subCommands: commands,
});
