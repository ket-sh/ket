import { defineCommand } from 'citty';

const load = {
  create: async () => import('./commands/create/command.ts'),
  update: async () => import('./commands/update/command.ts'),
  watch: async () => import('./commands/watch/command.ts'),
  map: async () => import('./commands/map/command.ts'),
  retro: async () => import('./commands/retro/command.ts'),
  gate: async () => import('./commands/gate/command.ts'),
  item: async () => import('./commands/item/command.ts'),
  review: async () => import('./commands/review/command.ts'),
  turn: async () => import('./commands/turn/command.ts'),
};

export const commands = {
  create: async () => (await load.create()).default,
  update: async () => (await load.update()).default,
  watch: async () => (await load.watch()).default,
  map: async () => (await load.map()).default,
  retro: async () => (await load.retro()).default,
};

export const hidden = {
  gate: async () => (await load.gate()).default,
  item: async () => (await load.item()).default,
  review: async () => (await load.review()).default,
  turn: async () => (await load.turn()).default,
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
