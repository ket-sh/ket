import type { Item } from './item.ts';
import type { JourneyPane, RepoFacts } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';

import { ITEM_STATUSES } from './item.ts';

function refusalsSince(events: LoggedEvent[], since: string | undefined): number {
  if (since === undefined) {
    return 0;
  }

  return events.filter(
    (event) => event.outcome === 'refused' && event.at !== undefined && event.at >= since,
  ).length;
}

export function paneOf(
  item: Item,
  events: LoggedEvent[],
  arrivedAt: string | undefined,
  repo: RepoFacts,
): JourneyPane {
  return {
    kind: item.kind,
    size: item.size,
    status: item.status,
    stageAt: ITEM_STATUSES.indexOf(item.status) + 1,
    stageOf: ITEM_STATUSES.length,
    parent: item.parent,
    refusedTimes: refusalsSince(events, arrivedAt),
    arrivedAt,
    lastEventAt: events.at(-1)?.at,
    filed: repo.filed,
    branch: repo.branch,
  };
}
