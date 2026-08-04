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

export type AdvisedSection = 'dependencies' | 'decisions' | 'kinds';

export function seenUnder(record: unknown, section: AdvisedSection): string[] {
  return isRecord(record) ? namesOf(record[section]) : [];
}

export function arrivalsIn(look: ToolchainLook): string[] {
  const covered = new Set([...look.shipped, ...look.seen]);

  return inOneOrder(
    look.declared.filter((name) => !covered.has(name) && resolvesInARegistry(name)),
  );
}

const TITLE_LIMIT = 200;

function carriesInAReply(title: string): boolean {
  return title.trim() !== '' && title.length <= TITLE_LIMIT;
}

export function decisionArrivalsIn(look: { titles: string[]; seen: string[] }): string[] {
  const seen = new Set(look.seen);

  return inOneOrder(look.titles.filter((title) => !seen.has(title) && carriesInAReply(title)));
}

export function recordAdvised(sections: Record<AdvisedSection, string[]>): string {
  const ordered = {
    dependencies: inOneOrder(sections.dependencies),
    decisions: inOneOrder(sections.decisions),
    kinds: inOneOrder(sections.kinds),
  };

  return `${JSON.stringify(ordered, undefined, INDENT)}\n`;
}
