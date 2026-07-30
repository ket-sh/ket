import type { ItemKind, ItemSize, ItemStatus } from './item.ts';
import type { Verdict } from './verdict.ts';

import { matchesGlob } from './glob.ts';
import { ALLOWED } from './verdict.ts';

const SCENARIO = '.feature';

const ITEM_FILE = '.ket/items/*/item.yaml';

const WRITEABLE: ItemStatus = 'implementing';

const ENVIRONMENT = '.env';

const ENVIRONMENT_TEMPLATE = '.env.example';

const KEY_SUFFIXES = ['.pem', '.key', '.p12'];

const KEY_NAMES = ['id_rsa', 'id_ed25519'];

export interface GovernedItem {
  key: string;
  kind: ItemKind;
  size: ItemSize;
  status: ItemStatus;
  children: string[];
}

export interface WriteAttempt {
  path: string;
  sources: string[];
  adapters: string[];
  lockfile: string;
  inFlight: GovernedItem[];
}

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

function delegates(item: GovernedItem, inFlight: GovernedItem[]): boolean {
  return inFlight.some((other) => other.key !== item.key && item.children.includes(other.key));
}

export function workingFrom(inFlight: GovernedItem[]): GovernedItem[] {
  return inFlight.filter((item) => !delegates(item, inFlight));
}

function governing(attempt: WriteAttempt, working: GovernedItem[]): GovernedItem | undefined {
  return underSource(attempt.path, attempt.sources) ? working[0] : undefined;
}

function nameOf(path: string): string {
  const segments = path.split('/');

  return segments[segments.length - 1] ?? path;
}

function generated(path: string, lockfile: string): Verdict | undefined {
  if (nameOf(path) !== lockfile) {
    return undefined;
  }

  return {
    refused: `${path} is a lockfile. Install the dependency rather than editing the record of one.`,
  };
}

function secret(path: string): Verdict | undefined {
  const name = nameOf(path);
  const holds = name === ENVIRONMENT || name.startsWith(`${ENVIRONMENT}.`);

  if (!holds || name === ENVIRONMENT_TEMPLATE) {
    return undefined;
  }

  return { refused: `${path} holds secrets. The person who owns them edits it.` };
}

function keyMaterial(path: string): Verdict | undefined {
  const name = nameOf(path);
  const material =
    KEY_SUFFIXES.some((suffix) => name.endsWith(suffix)) ||
    KEY_NAMES.some((known) => name.startsWith(known));

  if (!material) {
    return undefined;
  }

  return { refused: `${path} is key material. The person who owns it edits it.` };
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
  const working = workingFrom(attempt.inFlight);
  const item = governing(attempt, working);

  if (item === undefined) {
    return ALLOWED;
  }

  return crowded(working) ?? unapproved(item) ?? misclassified(item, attempt) ?? ALLOWED;
}

function sealed(attempt: WriteAttempt): Verdict | undefined {
  return (
    generated(attempt.path, attempt.lockfile) ??
    secret(attempt.path) ??
    keyMaterial(attempt.path) ??
    byHand(attempt.path)
  );
}

export function verdictFor(attempt: WriteAttempt): Verdict {
  return sealed(attempt) ?? governed(attempt);
}
