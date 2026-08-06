import { stopSurface } from './server.ts';
import { surfaceItemDir } from './show.ts';

export function closingSurface<Held, Outcome extends object>(
  decide: (item: Held, root: string, key: string) => Promise<Outcome>,
): (item: Held, root: string, key: string) => Promise<Outcome> {
  return async (item, root, key) => {
    const outcome = await decide(item, root, key);

    if ('refused' in outcome) {
      return outcome;
    }

    await stopSurface(surfaceItemDir(root, key));

    return outcome;
  };
}
