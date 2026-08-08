import { useEffect, useRef } from 'react';

import type { BoardLayout } from './board-layout.ts';
import type { FrameStack, JourneyTab } from './frames.ts';
import type { Seat } from './seat.ts';

export type OpeningStage = { kind: 'journey'; key: string; tab: JourneyTab } | { kind: 'map' };

export interface WatchView {
  layout?: BoardLayout;
  chosen?: string;
  stage?: OpeningStage;
}

interface OpeningDoors {
  stack: FrameStack;
  seat: Seat;
  wear: (landing: BoardLayout) => void;
}

function stagedThrough(stage: OpeningStage, stack: FrameStack): void {
  if (stage.kind === 'map') {
    stack.openMap();

    return;
  }

  stack.dive(stage.key, stage.tab);
}

function openedThrough(opening: WatchView, doors: OpeningDoors): void {
  if (opening.layout !== undefined) {
    doors.wear(opening.layout);
  }

  if (opening.chosen !== undefined) {
    doors.seat.seek(opening.chosen);
  }

  if (opening.stage !== undefined) {
    stagedThrough(opening.stage, doors.stack);
  }
}

export function useOpening(
  opening: WatchView | undefined,
  loaded: boolean,
  doors: OpeningDoors,
): void {
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || !loaded || opening === undefined) {
      return;
    }

    opened.current = true;
    openedThrough(opening, doors);
  }, [opening, loaded, doors]);
}

export function useRemember(
  remember: ((view: WatchView) => void) | undefined,
  view: WatchView,
): void {
  const held = useRef(view);

  held.current = view;

  const marked = JSON.stringify(view);

  useEffect(() => {
    remember?.(held.current);
  }, [remember, marked]);
}
