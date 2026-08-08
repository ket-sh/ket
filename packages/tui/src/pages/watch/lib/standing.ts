import type { BoardLayout } from '../model/board-layout.ts';
import type { Frame } from '../model/frames.ts';
import type { OpeningStage, WatchView } from '../model/opening.ts';

function stageOf(frame: Frame): OpeningStage | undefined {
  if (frame.kind === 'journey') {
    return { kind: 'journey', key: frame.journey.item, tab: frame.tab };
  }

  return frame.kind === 'map' ? { kind: 'map' } : undefined;
}

function deepestStageIn(frames: Frame[]): OpeningStage | undefined {
  const resting = frames.findLast((frame) => stageOf(frame) !== undefined);

  return resting === undefined ? undefined : stageOf(resting);
}

export function standingOf(
  layout: BoardLayout,
  frames: Frame[],
  chosen: string | undefined,
): WatchView {
  const stage = deepestStageIn(frames);

  return {
    layout,
    ...(chosen === undefined ? {} : { chosen }),
    ...(stage === undefined ? {} : { stage }),
  };
}
