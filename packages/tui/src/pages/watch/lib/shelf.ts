import type { UnfiledShelfView, UnfiledStoryView } from '../../../shared/model';

export interface ShelfSpot {
  rows: number;
  spare: number;
  whole: boolean;
}

export function releaseRowsOf(unfiled: UnfiledShelfView): UnfiledStoryView[] {
  return unfiled.stories;
}

export function wholeRowsOf(unfiled: UnfiledShelfView): UnfiledStoryView[] {
  return [...unfiled.stories, ...unfiled.unassigned];
}
