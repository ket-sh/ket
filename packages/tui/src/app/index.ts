import type { CliRenderer } from '@opentui/core';

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { createElement } from 'react';

import type { WatchView } from '../pages/watch';
import type { BoardFeed, MapReadingView } from '../shared/model';

import { MapScreen } from '../pages/map';
import { WatchPage } from '../pages/watch';

export interface WatchOptions {
  enhance?: (renderer: CliRenderer) => void;
  opening?: WatchView | undefined;
  remember?: ((view: WatchView) => void) | undefined;
}

export async function watch(feed: BoardFeed, options: WatchOptions = {}): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  options.enhance?.(renderer);

  const onQuit = (): void => {
    renderer.destroy();
    process.exit(0);
  };

  createRoot(renderer).render(
    createElement(WatchPage, {
      feed,
      onQuit,
      opening: options.opening,
      remember: options.remember,
    }),
  );
}

export async function storyMap(reading: MapReadingView): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  const onQuit = (): void => {
    renderer.destroy();
    process.exit(0);
  };

  createRoot(renderer).render(createElement(MapScreen, { reading, onQuit }));
}
