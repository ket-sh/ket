import type { CliRenderer } from '@opentui/core';

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { createElement } from 'react';

import type { ItemView } from '../shared/model';

import { WatchPage } from '../pages/watch';
import { SAMPLE } from '../shared/model';

export interface WatchOptions {
  enhance?: (renderer: CliRenderer) => void;
}

export async function watch(item: ItemView = SAMPLE, options: WatchOptions = {}): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  options.enhance?.(renderer);

  createRoot(renderer).render(createElement(WatchPage, { item }));
}
