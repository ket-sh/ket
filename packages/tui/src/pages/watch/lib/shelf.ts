import type { UnfiledShelfView } from '../../../shared/model';

export interface ShelfSpot {
  rows: number;
  spare: number;
  whole: boolean;
}

export function releaseShelfOf(unfiled: UnfiledShelfView): ShelfSpot {
  return {
    rows: unfiled.stories.length,
    spare: unfiled.unassigned.length,
    whole: false,
  };
}
