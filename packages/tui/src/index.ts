import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { createElement } from 'react';

import type { ItemView } from './view.ts';

import { App } from './app.tsx';
import { SAMPLE } from './sample.ts';

export type { ItemView, StageView } from './view.ts';

export async function watch(item: ItemView = SAMPLE): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });

  createRoot(renderer).render(createElement(App, { item }));
}
