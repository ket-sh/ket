import { useCallback, useMemo, useState } from 'react';

import type {
  BoardFeed,
  GateActionView,
  JourneyView,
  KanbanCardView,
  SurfaceDocView,
} from '../../../shared/model';
import type { Draft } from '../lib/edit.ts';
import type { Direction } from './compass.ts';
import type { Frame, FrameStack, JourneyTab, Tuning } from './frames.ts';
import type { Doors } from './journey-tabs.ts';

import {
  askFrameOf,
  editing,
  judged,
  landingOf,
  logSeated,
  logSlid,
  mapSeated,
  mapWalked,
  revisedIn,
  savedMark,
  scrolled,
  surfaceFrame,
  tuned,
} from './frames.ts';
import { aimedAt, enteredIn, tabbedTo, tabbed, walked } from './journey-tabs.ts';

type Grow = (grow: (stack: Frame[]) => Frame[]) => void;

type Ceremony = Pick<FrameStack, 'gate' | 'pass'>;

function useCeremony(feed: BoardFeed, top: Frame, setFrames: Grow): Ceremony {
  const gate = useCallback(
    (action: GateActionView, card: KanbanCardView, tick: number) => {
      setFrames((stack) => [...stack, askFrameOf(action, card, tick)]);
    },
    [setFrames],
  );

  const pass = useCallback(
    (tick: number) => {
      if (top.kind !== 'gate' || top.phase !== 'ask') {
        return;
      }

      void feed.act(top.cardKey, top.action).then((outcome) => {
        setFrames((stack) => judged(stack, outcome, tick));
      });
    },
    [top, feed, setFrames],
  );

  return { gate, pass };
}

type Editing = Pick<FrameStack, 'edit' | 'revise' | 'save'>;

function useEditing(feed: BoardFeed, top: Frame, setFrames: Grow): Editing {
  const edit = useCallback(() => {
    setFrames(editing);
  }, [setFrames]);

  const revise = useCallback(
    (change: (draft: Draft) => Draft) => {
      setFrames((stack) => revisedIn(stack, change));
    },
    [setFrames],
  );

  const save = useCallback(
    (tick: number) => {
      if (top.kind !== 'edit') {
        return;
      }

      void feed.saveCriteria(top.item, top.name, top.draft.lines.join('\n')).then(() => {
        setFrames((stack) => savedMark(stack, tick));
      });
    },
    [top, feed, setFrames],
  );

  return { edit, revise, save };
}

type Mapping = Pick<FrameStack, 'mapWalk' | 'openMap' | 'mapSeat'>;

function useMapping(feed: BoardFeed, setFrames: Grow): Mapping {
  const openMap = useCallback(() => {
    void feed.storyMap().then((reading) => {
      setFrames((stack) => [...stack, { kind: 'map', reading, at: 0 }]);
    });
  }, [feed, setFrames]);

  const mapWalk = useCallback(
    (name: string) => {
      setFrames((stack) => mapWalked(stack, name));
    },
    [setFrames],
  );

  const mapSeat = useCallback(
    (at: number) => {
      setFrames((stack) => mapSeated(stack, at));
    },
    [setFrames],
  );

  return { openMap, mapWalk, mapSeat };
}

type Logging = Pick<FrameStack, 'openLog' | 'logSeat' | 'logSlide'>;

function useLogging(feed: BoardFeed, setFrames: Grow): Logging {
  const openLog = useCallback(() => {
    void feed.oplog().then((events) => {
      setFrames((stack) => [...stack, { kind: 'oplog', events, sel: 0 }]);
    });
  }, [feed, setFrames]);

  const logSeat = useCallback(
    (at: number) => {
      setFrames((stack) => logSeated(stack, at));
    },
    [setFrames],
  );

  const logSlide = useCallback(
    (delta: number, most: number) => {
      setFrames((stack) => logSlid(stack, delta, most));
    },
    [setFrames],
  );

  return { openLog, logSeat, logSlide };
}

function useEntering(top: Frame, doors: Doors) {
  return useCallback(() => {
    if (top.kind === 'journey') {
      enteredIn(top, doors);
    }
  }, [top, doors]);
}

type Diving = Pick<FrameStack, 'dive' | 'enter'>;

function useDiving(
  feed: BoardFeed,
  top: Frame,
  setFrames: Grow,
  showTab: (tab: JourneyTab) => void,
): Diving {
  const dive = useCallback(
    (key: string | undefined, tab: JourneyTab = 'overview') => {
      if (key === undefined) {
        return;
      }

      void feed.journey(key).then((journey) => {
        if (journey !== undefined) {
          setFrames((stack) => [
            ...stack,
            {
              kind: 'journey',
              journey,
              sel: landingOf(journey),
              tab,
              pick: 0,
              focus: 'canvas',
            },
          ]);
        }
      });
    },
    [feed, setFrames],
  );

  const open = useCallback(
    (journey: JourneyView, doc: SurfaceDocView) => {
      setFrames((stack) => [...stack, surfaceFrame(journey, doc)]);
    },
    [setFrames],
  );

  const enter = useEntering(
    top,
    useMemo(() => ({ dive, open, showTab }), [dive, open, showTab]),
  );

  return { dive, enter };
}

type Steering = Pick<FrameStack, 'showTab' | 'aim' | 'walk' | 'tab'>;

function useSteering(setFrames: Grow): Steering {
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

  return { showTab, aim, walk, tab };
}

export function useFrameStack(feed: BoardFeed): FrameStack {
  const [frames, setFrames] = useState<Frame[]>([{ kind: 'board' }]);
  const top = frames[frames.length - 1] ?? ({ kind: 'board' } as const);
  const { gate, pass } = useCeremony(feed, top, setFrames);
  const { edit, revise, save } = useEditing(feed, top, setFrames);
  const { openMap, mapWalk, mapSeat } = useMapping(feed, setFrames);
  const { openLog, logSeat, logSlide } = useLogging(feed, setFrames);
  const { showTab, aim, walk, tab } = useSteering(setFrames);
  const { dive, enter } = useDiving(feed, top, setFrames, showTab);

  const scroll = useCallback((delta: number, most: number) => {
    setFrames((stack) => scrolled(stack, delta, most));
  }, []);

  const tune = useCallback((tuning: Tuning) => {
    setFrames((stack) => tuned(stack, tuning));
  }, []);

  const pop = useCallback(() => {
    setFrames((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }, []);

  const home = useCallback(() => {
    setFrames([{ kind: 'board' }]);
  }, []);

  return {
    frames,
    top,
    dive,
    tab,
    showTab,
    aim,
    openMap,
    mapWalk,
    mapSeat,
    openLog,
    logSeat,
    logSlide,
    enter,
    walk,
    scroll,
    tune,
    gate,
    pass,
    edit,
    revise,
    save,
    pop,
    home,
  };
}
