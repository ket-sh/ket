import { useCallback, useState } from 'react';

import type {
  BoardFeed,
  GateActionView,
  JourneyView,
  KanbanCardView,
  MovedView,
  SurfaceDocView,
} from '../../../shared/model';
import type { Audience } from '../lib/lines.ts';
import type { Direction } from './compass.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';

export type Frame =
  | { kind: 'board' }
  | { kind: 'journey'; journey: JourneyView; sel: string }
  | { kind: 'surface'; title: string; doc: SurfaceDocView; aud: Audience; off: number }
  | {
      kind: 'gate';
      action: GateActionView;
      cardKey: string;
      cardTitle: string;
      phase: 'ask' | 'pass' | 'refuse';
      reason: string | undefined;
      since: number;
    };

type Tuning = 'toggle' | 'technical' | 'plain';

export interface FrameStack {
  frames: Frame[];
  top: Frame;
  dive: (key: string | undefined) => void;
  enter: () => void;
  walk: (direction: Direction) => void;
  scroll: (delta: number, most: number) => void;
  tune: (tuning: Tuning) => void;
  gate: (action: GateActionView, card: KanbanCardView, tick: number) => void;
  pass: (tick: number) => void;
  pop: () => void;
}

function lastOf(nodes: JourneyView['nodes']): string | undefined {
  return nodes[nodes.length - 1]?.id;
}

function landingOf(journey: JourneyView): string {
  const stages = journey.nodes.filter((node) => node.kind === 'stage');
  const active = [...stages].reverse().find((node) => node.mark === 'active');

  return active?.id ?? lastOf(stages) ?? lastOf(journey.nodes) ?? '';
}

function crumbStepOf(frame: Frame): string {
  if (frame.kind === 'board') {
    return 'board';
  }

  if (frame.kind === 'journey') {
    return frame.journey.item;
  }

  return frame.kind === 'gate' ? frame.cardKey : (frame.title.split(' · ')[0] ?? '');
}

export function crumbOf(frames: Frame[]): string {
  return frames.map((frame) => crumbStepOf(frame)).join(' › ');
}

function walked(stack: Frame[], direction: Direction): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'journey') {
    return stack;
  }

  const sel = neighborOf(placedOf(above.journey).nodes, above.sel, direction);

  return [...stack.slice(0, -1), { ...above, sel }];
}

function scrolled(stack: Frame[], delta: number, most: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'surface') {
    return stack;
  }

  const seated = Math.min(Math.max(above.off, 0), most);
  const off = Math.min(most, Math.max(0, seated + delta));

  return [...stack.slice(0, -1), { ...above, off }];
}

function tunedSide(aud: Audience, tuning: Tuning): Audience {
  if (tuning === 'toggle') {
    return aud === 'technical' ? 'plain' : 'technical';
  }

  return tuning;
}

function judged(stack: Frame[], outcome: MovedView, tick: number): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'gate') {
    return stack;
  }

  const next: Frame =
    'moved' in outcome
      ? { ...above, phase: 'pass', since: tick }
      : { ...above, phase: 'refuse', reason: outcome.refused, since: tick };

  return [...stack.slice(0, -1), next];
}

const PASS_TICKS = 16;

export function outstayed(frame: Frame, tick: number): boolean {
  return frame.kind === 'gate' && frame.phase === 'pass' && tick - frame.since > PASS_TICKS;
}

function tuned(stack: Frame[], tuning: Tuning): Frame[] {
  const above = stack[stack.length - 1];

  if (above?.kind !== 'surface' || !('plain' in above.doc) || above.doc.plain === undefined) {
    return stack;
  }

  return [...stack.slice(0, -1), { ...above, aud: tunedSide(above.aud, tuning), off: 0 }];
}

interface Seated {
  journey: JourneyView;
  node: JourneyView['nodes'][number];
}

function selectedNodeOf(frame: Frame): Seated | undefined {
  if (frame.kind !== 'journey') {
    return undefined;
  }

  const node = frame.journey.nodes.find((one) => one.id === frame.sel);

  return node === undefined ? undefined : { journey: frame.journey, node };
}

function surfaceFrame(journey: JourneyView, doc: SurfaceDocView): Frame {
  return {
    kind: 'surface',
    title: `${journey.item} · ${doc.label}`,
    doc,
    aud: 'technical',
    off: 0,
  };
}

function askFrameOf(action: GateActionView, card: KanbanCardView, tick: number): Frame {
  return {
    kind: 'gate',
    action,
    cardKey: card.key,
    cardTitle: card.title,
    phase: 'ask',
    reason: undefined,
    since: tick,
  };
}

type Ceremony = Pick<FrameStack, 'gate' | 'pass'>;

function useCeremony(
  feed: BoardFeed,
  top: Frame,
  setFrames: (grow: (stack: Frame[]) => Frame[]) => void,
): Ceremony {
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

export function useFrameStack(feed: BoardFeed): FrameStack {
  const [frames, setFrames] = useState<Frame[]>([{ kind: 'board' }]);
  const top = frames[frames.length - 1] ?? ({ kind: 'board' } as const);
  const { gate, pass } = useCeremony(feed, top, setFrames);

  const dive = useCallback(
    (key: string | undefined) => {
      if (key === undefined) {
        return;
      }

      void feed.journey(key).then((journey) => {
        if (journey !== undefined) {
          setFrames((stack) => [...stack, { kind: 'journey', journey, sel: landingOf(journey) }]);
        }
      });
    },
    [feed],
  );

  const open = useCallback((journey: JourneyView, doc: SurfaceDocView) => {
    setFrames((stack) => [...stack, surfaceFrame(journey, doc)]);
  }, []);

  const enter = useCallback(() => {
    const seated = selectedNodeOf(top);

    if (seated === undefined) {
      return;
    }

    if (seated.node.child !== undefined) {
      dive(seated.node.child);

      return;
    }

    if (seated.node.doc !== undefined) {
      open(seated.journey, seated.node.doc);
    }
  }, [top, dive, open]);

  const walk = useCallback((direction: Direction) => {
    setFrames((stack) => walked(stack, direction));
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

  return { frames, top, dive, enter, walk, scroll, tune, gate, pass, pop };
}
