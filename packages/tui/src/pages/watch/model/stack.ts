import { useCallback, useState } from 'react';

import type {
  BoardFeed,
  GateActionView,
  JourneyView,
  KanbanCardView,
  SurfaceDocView,
} from '../../../shared/model';
import type { Draft } from '../lib/edit.ts';
import type { Direction } from './compass.ts';
import type { Frame, FrameStack, Tuning } from './frames.ts';
import type { Opened } from './journey-tabs.ts';

import {
  askFrameOf,
  editing,
  judged,
  landingOf,
  mapWalked,
  revisedIn,
  savedMark,
  scrolled,
  selectedNodeOf,
  surfaceFrame,
  tuned,
} from './frames.ts';
import { tabbed, walked } from './journey-tabs.ts';

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

type Mapping = Pick<FrameStack, 'mapWalk' | 'openMap'>;

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

  return { openMap, mapWalk };
}

type Opening = (journey: JourneyView, doc: SurfaceDocView) => void;

function useEntering(top: Frame, dive: (key: string | undefined) => void, open: Opening) {
  const enterArtifact = useCallback(
    (frame: Opened) => {
      const doc = frame.journey.artifacts[frame.pick]?.doc;

      if (doc !== undefined) {
        open(frame.journey, doc);
      }
    },
    [open],
  );

  const enterStage = useCallback(
    (frame: Opened) => {
      const seated = selectedNodeOf(frame);

      if (seated?.node.doc !== undefined) {
        open(seated.journey, seated.node.doc);
      }
    },
    [open],
  );

  return useCallback(() => {
    if (top.kind !== 'journey') {
      return;
    }

    if (top.tab === 'children') {
      dive(top.journey.children[top.pick]?.key);

      return;
    }

    if (top.tab === 'artifacts') {
      enterArtifact(top);

      return;
    }

    enterStage(top);
  }, [top, dive, enterArtifact, enterStage]);
}

type Diving = Pick<FrameStack, 'dive' | 'enter'>;

function useDiving(feed: BoardFeed, top: Frame, setFrames: Grow): Diving {
  const dive = useCallback(
    (key: string | undefined) => {
      if (key === undefined) {
        return;
      }

      void feed.journey(key).then((journey) => {
        if (journey !== undefined) {
          setFrames((stack) => [
            ...stack,
            { kind: 'journey', journey, sel: landingOf(journey), tab: 'overview', pick: 0 },
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

  const enter = useEntering(top, dive, open);

  return { dive, enter };
}

export function useFrameStack(feed: BoardFeed): FrameStack {
  const [frames, setFrames] = useState<Frame[]>([{ kind: 'board' }]);
  const top = frames[frames.length - 1] ?? ({ kind: 'board' } as const);
  const { gate, pass } = useCeremony(feed, top, setFrames);
  const { edit, revise, save } = useEditing(feed, top, setFrames);
  const { openMap, mapWalk } = useMapping(feed, setFrames);
  const { dive, enter } = useDiving(feed, top, setFrames);

  const walk = useCallback((direction: Direction) => {
    setFrames((stack) => walked(stack, direction));
  }, []);

  const tab = useCallback(() => {
    setFrames((stack) => tabbed(stack));
  }, []);

  const scroll = useCallback((delta: number, most: number) => {
    setFrames((stack) => scrolled(stack, delta, most));
  }, []);

  const tune = useCallback((tuning: Tuning) => {
    setFrames((stack) => tuned(stack, tuning));
  }, []);

  const pop = useCallback(() => {
    setFrames((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }, []);

  return {
    frames,
    top,
    dive,
    tab,
    openMap,
    mapWalk,
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
  };
}
