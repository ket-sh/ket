import { defineCommand, showUsage } from 'citty';

import { COMMAND_ARGS } from '../../shared/args.ts';
import { ketRootOrThrow } from '../../shared/locate.ts';
import { partSays } from '../../shared/parts.ts';
import { mapShowingIn } from '../../shared/story-map/reading.ts';

const map = defineCommand({
  meta: {
    name: 'map',
    description: partSays('map'),
  },
  args: COMMAND_ARGS,
  async run() {
    const root = await ketRootOrThrow(process.cwd());
    const showing = await mapShowingIn(root);

    if ('refusals' in showing) {
      for (const refusal of showing.refusals) {
        console.error(`ket map: ${refusal}`);
      }

      process.exit(1);
    }

    const { storyMap } = await import('@ket/tui');

    await storyMap(showing);
  },
});

export async function usage(): Promise<void> {
  await showUsage(map);
}

export default map;
