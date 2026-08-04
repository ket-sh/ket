const SEEN = 'seen';

const DECLARING = ['dependencies', 'devDependencies'];

const INDENT = 2;

// A name that lands in a proposal a session reads has to be one a registry
// could resolve, never a manifest key carrying a newline or an instruction.
const REGISTRY_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u;

const NAME_LIMIT = 214;

function resolvesInARegistry(name: string): boolean {
  return name.length <= NAME_LIMIT && REGISTRY_NAME.test(name);
}

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

  return inOneOrder(
    look.declared.filter((name) => !covered.has(name) && resolvesInARegistry(name)),
  );
}

export function recordToolchain(names: string[]): string {
  return `${JSON.stringify({ [SEEN]: inOneOrder(names) }, undefined, INDENT)}\n`;
}
