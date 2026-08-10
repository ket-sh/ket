import { useState } from 'react';

import type { UnfiledShelfView, UnfiledStoryView } from '../../../shared/model';
import type { ShelfSpot } from '../lib/shelf.ts';

import { shelfStepped } from '../lib/backlog-walk.ts';
import { releaseRowsOf, wholeRowsOf } from '../lib/shelf.ts';

export interface ShelfSeat {
  rows: UnfiledStoryView[];
  chosen: UnfiledStoryView | undefined;
  spot: ShelfSpot;
  include: () => void;
  walk: (delta: number, filedLeft: number) => boolean;
}

export function useShelfSeat(unfiled: UnfiledShelfView): ShelfSeat {
  const [whole, setWhole] = useState(false);
  const [at, setAt] = useState<number | undefined>(undefined);
  const rows = whole ? wholeRowsOf(unfiled) : releaseRowsOf(unfiled);
  const seated = at !== undefined && at < rows.length ? at : undefined;

  const include = (): void => {
    setWhole((worn) => !worn);
  };

  const walk = (delta: number, filedLeft: number): boolean => {
    const stepped = shelfStepped({ at: seated, rows: rows.length, filedLeft }, delta);

    setAt(stepped.at);

    return stepped.took;
  };

  return {
    rows,
    chosen: seated === undefined ? undefined : rows[seated],
    spot: { rows: rows.length, spare: unfiled.unassigned.length, whole },
    include,
    walk,
  };
}
