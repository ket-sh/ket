import { defineCommand } from 'citty';

const load = {
  create: async () => import('./commands/create/command.ts'),
  watch: async () => import('./commands/watch/command.ts'),
  gate: async () => import('./commands/gate/command.ts'),
  item: async () => import('./commands/item/command.ts'),
  review: async () => import('./commands/review/command.ts'),
};

export const commands = {
  create: async () => (await load.create()).default,
  watch: async () => (await load.watch()).default,
};

export const hidden = {
  gate: async () => (await load.gate()).default,
  item: async () => (await load.item()).default,
  review: async () => (await load.review()).default,
};

export async function showUsageOf(name: keyof typeof commands): Promise<void> {
  await (await load[name]()).usage();
}

export const main = defineCommand({
  meta: {
    name: 'ket',
    description: 'Create a project under ket, and watch the pipeline run',
  },
  subCommands: commands,
});
