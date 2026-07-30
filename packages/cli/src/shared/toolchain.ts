const SEEN = 'seen';

const DECLARING = ['dependencies', 'devDependencies'];

const INDENT = 2;

export interface ToolchainLook {
  declared: string[];
  shipped: string[];
  seen: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keysOf(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

function namesOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: unknown[] = value;

  return entries.filter((entry) => typeof entry === 'string');
}

function inOneOrder(names: string[]): string[] {
  return [...new Set(names)].toSorted();
}

export function declaredIn(manifest: unknown): string[] {
  return isRecord(manifest) ? DECLARING.flatMap((field) => keysOf(manifest[field])) : [];
}

export function seenIn(record: unknown): string[] {
  return isRecord(record) ? namesOf(record[SEEN]) : [];
}

export function arrivalsIn(look: ToolchainLook): string[] {
  const covered = new Set([...look.shipped, ...look.seen]);

  return inOneOrder(look.declared.filter((name) => !covered.has(name)));
}

export function recordToolchain(names: string[]): string {
  return `${JSON.stringify({ [SEEN]: inOneOrder(names) }, undefined, INDENT)}\n`;
}
