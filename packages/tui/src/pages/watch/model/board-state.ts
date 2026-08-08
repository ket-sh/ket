import { useCallback, useEffect, useState } from 'react';

import type { BoardFeed, KanbanColumnView } from '../../../shared/model';

import { AGE_TICK } from '../../../shared/lib';

const PULSE = 120;

export interface BoardState {
  columns: KanbanColumnView[];
  loaded: boolean;
  now: string;
  tick: number;
  refresh: () => void;
}

export function useBoardState(feed: BoardFeed, clock: () => string): BoardState {
  const [columns, setColumns] = useState<KanbanColumnView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(clock());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    void feed.snapshot().then((fresh) => {
      setColumns(fresh);
      setLoaded(true);
    });
  }, [feed]);

  useEffect(() => {
    refresh();

    return feed.subscribe(refresh);
  }, [feed, refresh]);

  useEffect(() => {
    const aging = setInterval(() => {
      setNow(clock());
    }, AGE_TICK);
    const pulsing = setInterval(() => {
      setTick((beat) => beat + 1);
    }, PULSE);

    return () => {
      clearInterval(aging);
      clearInterval(pulsing);
    };
  }, [clock]);

  return { columns, loaded, now, tick, refresh };
}
