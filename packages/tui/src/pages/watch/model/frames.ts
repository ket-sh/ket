import { useCallback, useState } from 'react';

import type { BoardFeed, JourneyView, KanbanCardView } from '../../../shared/model';
import type { Direction } from './compass.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';

export type Frame = { kind: 'board' } | { kind: 'journey'; journey: JourneyView; sel: string };

export interface FrameStack {
  frames: Frame[];
  top: Frame;
  dive: (card: KanbanCardView | undefined) => void;
  walk: (direction: Direction) => void;
  pop: () => void;
}

function landingOf(journey: JourneyView): string {
  const active = [...journey.nodes].reverse().find((node) => node.mark === 'active');

  return active?.id ?? journey.nodes[journey.nodes.length - 1]?.id ?? '';
}

export function crumbOf(frames: Frame[]): string {
  return frames.map((frame) => (frame.kind === 'board' ? 'board' : frame.journey.item)).join(' › ');
}

function walked(stack: Frame[], direction: Direction): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  const sel = neighborOf(placedOf(above.journey).nodes, above.sel, direction);

  return [...stack.slice(0, -1), { ...above, sel }];
}

export function useFrameStack(feed: BoardFeed): FrameStack {
  const [frames, setFrames] = useState<Frame[]>([{ kind: 'board' }]);

  const dive = useCallback(
    (card: KanbanCardView | undefined) => {
      if (card === undefined) {
        return;
      }

      void feed.journey(card.key).then((journey) => {
        if (journey !== undefined) {
          setFrames((stack) => [...stack, { kind: 'journey', journey, sel: landingOf(journey) }]);
        }
      });
    },
    [feed],
  );

  const walk = useCallback((direction: Direction) => {
    setFrames((stack) => walked(stack, direction));
  }, []);

  const pop = useCallback(() => {
    setFrames((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }, []);

  return {
    frames,
    top: frames[frames.length - 1] ?? { kind: 'board' },
    dive,
    walk,
    pop,
  };
}
