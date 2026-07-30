import { installCapture } from '@anscribe/opentui';

import { SAMPLE } from '../shared/model';
import { watch } from './index.ts';

await watch(SAMPLE, {
  enhance: (renderer) => {
    installCapture(renderer, { keybinding: 'ctrl+g' });
  },
});
