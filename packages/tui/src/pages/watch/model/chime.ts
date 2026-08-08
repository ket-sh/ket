import { useRenderer } from '@opentui/react';
import { useCallback, useEffect, useRef } from 'react';

import type { KanbanColumnView } from '../../../shared/model';

import { bellsAmong } from '../lib/attention.ts';

export type Ring = (message: string, title?: string) => void;

const CHIME_TITLE = 'ket watch';

function useDesktopRing(): Ring {
  const renderer = useRenderer();

  return useCallback(
    (message, title) => {
      renderer.triggerNotification(message, title);
    },
    [renderer],
  );
}

export function useChime(columns: KanbanColumnView[], loaded: boolean, ring?: Ring): void {
  const desktop = useDesktopRing();
  const rung = ring ?? desktop;
  const seen = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const bells = bellsAmong(columns);
    const primed = seen.current;

    if (primed === undefined) {
      seen.current = new Set(bells.map((bell) => bell.signature));

      return;
    }

    for (const bell of bells.filter((waiting) => !primed.has(waiting.signature))) {
      primed.add(bell.signature);
      rung(bell.message, CHIME_TITLE);
    }
  }, [columns, loaded, rung]);
}
