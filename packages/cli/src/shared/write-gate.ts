import type { ItemKind, ItemSize, ItemStatus } from './item.ts';

import { matchesGlob } from './glob.ts';

const SCENARIO = '.feature';

const ITEM_FILE = '.ket/items/*/item.yaml';

const WRITEABLE: ItemStatus = 'implementing';

export interface GovernedItem {
  key: string;
  kind: ItemKind;
  size: ItemSize;
  status: ItemStatus;
}

export interface WriteAttempt {
  path: string;
  sources: string[];
  adapters: string[];
  inFlight: GovernedItem[];
}

export type Verdict = { allowed: true } | { refused: string };

const ALLOWED: Verdict = { allowed: true };

function underSource(path: string, sources: string[]): boolean {
  return sources.some((source) => path === source || path.startsWith(`${source}/`));
}

function isAdapter(path: string, adapters: string[]): boolean {
  return adapters.some((pattern) => matchesGlob(pattern, path));
}

function crowded(inFlight: GovernedItem[]): Verdict | undefined {
  if (inFlight.length < 2) {
    return undefined;
  }

  const keys = inFlight.map((item) => item.key);

  return {
    refused: `${keys.join(' and ')} are both in flight. One job means one branch.`,
  };
}

function unapproved(item: GovernedItem): Verdict | undefined {
  if (item.status === WRITEABLE) {
    return undefined;
  }

  return {
    refused: `${item.key} is ${item.status}, not implementing. Approval comes before source.`,
  };
}

function misclassified(item: GovernedItem, attempt: WriteAttempt): Verdict | undefined {
  if (item.size === 'trivial' && isAdapter(attempt.path, attempt.adapters)) {
    return {
      refused: `${item.key} is trivial, and ${attempt.path} is an adapter. It was never trivial, so triage runs again.`,
    };
  }

  if (item.kind === 'refactor' && attempt.path.endsWith(SCENARIO)) {
    return {
      refused: `${item.key} is a refactor, and ${attempt.path} is a scenario. A changed scenario makes it a feature.`,
    };
  }

  return undefined;
}

function governing(attempt: WriteAttempt): GovernedItem | undefined {
  return underSource(attempt.path, attempt.sources) ? attempt.inFlight[0] : undefined;
}

function byHand(path: string): Verdict | undefined {
  if (!matchesGlob(ITEM_FILE, path)) {
    return undefined;
  }

  return {
    refused: `${path} records a status, and only a gate writes one. Use /ket:approve.`,
  };
}

function governed(attempt: WriteAttempt): Verdict {
  const item = governing(attempt);

  if (item === undefined) {
    return ALLOWED;
  }

  return crowded(attempt.inFlight) ?? unapproved(item) ?? misclassified(item, attempt) ?? ALLOWED;
}

export function verdictFor(attempt: WriteAttempt): Verdict {
  return byHand(attempt.path) ?? governed(attempt);
}
