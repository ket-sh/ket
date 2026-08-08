import type { BoardLayout, JourneyTab, OpeningStage, WatchView } from '@ket/tui';

export type { OpeningStage, WatchView };

interface OpeningAsk {
  key?: string | undefined;
  tab?: string | undefined;
  screen?: string | undefined;
}

type OpeningReading = { opening: WatchView | undefined } | { refused: string };

const TABS: JourneyTab[] = ['overview', 'workflow', 'children', 'artifacts'];

const LAYOUTS: BoardLayout[] = ['kanban', 'list', 'backlog'];

export function isTab(word: string): word is JourneyTab {
  return TABS.some((tab) => tab === word);
}

export function isLayout(word: string): word is BoardLayout {
  return LAYOUTS.some((layout) => layout === word);
}

function journeyOpening(key: string, tab: string | undefined): OpeningReading {
  if (tab !== undefined && !isTab(tab)) {
    return { refused: `${tab} names no journey tab. watch shows ${TABS.join(', ')}` };
  }

  return { opening: { stage: { kind: 'journey', key, tab: tab ?? 'overview' } } };
}

function screenOpening(screen: string): OpeningReading {
  if (screen === 'list') {
    return { opening: { layout: 'list' } };
  }

  if (screen === 'map' || screen === 'oplog' || screen === 'docs') {
    return { opening: { stage: { kind: screen } } };
  }

  return { refused: `${screen} names no watch screen. watch opens list, map, oplog, or docs` };
}

function keylessOpening(tab: string | undefined, screen: string | undefined): OpeningReading {
  if (tab !== undefined) {
    return { refused: '--tab needs an item key to open a journey' };
  }

  return screen === undefined ? { opening: undefined } : screenOpening(screen);
}

export function openedFrom(
  asked: WatchView | undefined,
  remembered: WatchView | undefined,
): WatchView | undefined {
  return asked ?? remembered;
}

export function openingOf(ask: OpeningAsk): OpeningReading {
  if (ask.key === undefined) {
    return keylessOpening(ask.tab, ask.screen);
  }

  if (ask.screen !== undefined) {
    return { refused: `${ask.key} and --screen ${ask.screen} ask for two openings. name one` };
  }

  return journeyOpening(ask.key, ask.tab);
}
