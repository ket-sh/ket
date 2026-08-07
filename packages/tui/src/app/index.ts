import type { CliRenderer } from '@opentui/core';

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { createElement } from 'react';

import type { BoardFeed } from '../shared/model';

import { KanbanPage } from '../pages/watch';

export interface WatchOptions {
  enhance?: (renderer: CliRenderer) => void;
}

export async function watch(feed: BoardFeed, options: WatchOptions = {}): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  options.enhance?.(renderer);

  const onQuit = (): void => {
    renderer.destroy();
    process.exit(0);
  };

  createRoot(renderer).render(createElement(KanbanPage, { feed, onQuit }));
}
