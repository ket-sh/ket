import { useCallback, useEffect, useState } from 'react';

import type { BoardFeed, KanbanColumnView, UnfiledShelfView } from '../../../shared/model';

import { AGE_TICK } from '../../../shared/lib';

const PULSE = 120;

const BARE_SHELF: UnfiledShelfView = { release: undefined, stories: [], unassigned: [] };

export interface BoardState {
  columns: KanbanColumnView[];
  unfiled: UnfiledShelfView;
  loaded: boolean;
  now: string;
  tick: number;
  refresh: () => void;
}

export function useBoardState(feed: BoardFeed, clock: () => string): BoardState {
  const [columns, setColumns] = useState<KanbanColumnView[]>([]);
  const [unfiled, setUnfiled] = useState<UnfiledShelfView>(BARE_SHELF);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(clock());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    void feed.snapshot().then((fresh) => {
      setColumns(fresh);
      setLoaded(true);
    });
    void feed.unfiledShelf().then(setUnfiled);
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

  return { columns, unfiled, loaded, now, tick, refresh };
}
