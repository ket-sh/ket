import { useCallback } from 'react';

import type { Audience } from '../lib/lines.ts';
import type { Direction } from './compass.ts';
import type { FrameStack, Grow, JourneyTab } from './frames.ts';

import { aimedAt, picked, sided, tabbedTo, tabbed, walked } from './journey-tabs.ts';

export type Steering = Pick<FrameStack, 'showTab' | 'aim' | 'walk' | 'tab' | 'pickAt' | 'readAs'>;

export function useSteering(setFrames: Grow): Steering {
  const showTab = useCallback(
    (tab: JourneyTab) => {
      setFrames((stack) => tabbedTo(stack, tab));
    },
    [setFrames],
  );

  const aim = useCallback(
    (sel: string) => {
      setFrames((stack) => aimedAt(stack, sel));
    },
    [setFrames],
  );

  const walk = useCallback(
    (direction: Direction) => {
      setFrames((stack) => walked(stack, direction));
    },
    [setFrames],
  );

  const tab = useCallback(() => {
    setFrames((stack) => tabbed(stack));
  }, [setFrames]);

  const pickAt = useCallback(
    (at: number) => {
      setFrames((stack) => picked(stack, at));
    },
    [setFrames],
  );

  const readAs = useCallback(
    (aud: Audience) => {
      setFrames((stack) => sided(stack, aud));
    },
    [setFrames],
  );

  return { showTab, aim, walk, tab, pickAt, readAs };
}
