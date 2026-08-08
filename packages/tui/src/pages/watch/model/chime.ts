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

  // Priming must happen with the first loaded paint, not in an effect: under a
  // slow scheduler the first effect can arrive after a later snapshot and
  // would swallow that transition as already-seen.
  if (loaded && seen.current === undefined) {
    seen.current = new Set(bellsAmong(columns).map((bell) => bell.signature));
  }

  useEffect(() => {
    const primed = seen.current;

    if (!loaded || primed === undefined) {
      return;
    }

    for (const bell of bellsAmong(columns).filter((waiting) => !primed.has(waiting.signature))) {
      primed.add(bell.signature);
      rung(bell.message, CHIME_TITLE);
    }
  }, [columns, loaded, rung]);
}
