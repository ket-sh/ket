import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { createElement } from 'react';

import type { ItemView } from '../shared/model';

import { WatchPage } from '../pages/watch';
import { SAMPLE } from '../shared/model';

export async function watch(item: ItemView = SAMPLE): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  createRoot(renderer).render(createElement(WatchPage, { item }));
}
