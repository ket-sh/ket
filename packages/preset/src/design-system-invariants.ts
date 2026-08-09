import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { writtenTo } from './contents.ts';
import { SOURCE_ALIAS, SOURCE_ROOT } from './source-alias.ts';

const DESIGN_SYSTEM_CONFIG = '~/components.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function utilsAliasIn(parsed: unknown): string | undefined {
  const aliases = isRecord(parsed) ? parsed['aliases'] : undefined;
  const utils = isRecord(aliases) ? aliases['utils'] : undefined;

  return typeof utils === 'string' ? utils : undefined;
}

// shadcn apply takes no lib path of its own: it resolves the utils alias,
// takes the parent directory, and writes its utils.ts helper there. A preset
// shipping no file at that landing leaves apply room to write a second
// helper, at a path the boundary gate refuses at the scaffold's first commit.
function landingBehind(alias: string): string {
  const aliased = `${alias.slice(0, alias.lastIndexOf('/'))}/utils.ts`;

  return aliased.replace(SOURCE_ALIAS, SOURCE_ROOT);
}

function landingInvariants(item: PresetItem, written: string): string[] {
  let declared: unknown;

  try {
    declared = JSON.parse(written);
  } catch {
    return ['the components.json the preset writes does not parse as JSON'];
  }

  const alias = utilsAliasIn(declared);

  if (alias === undefined) {
    return ['the components.json the preset writes names no utils alias'];
  }

  const landing = landingBehind(alias);

  return item.files.some((file) => file.target === `~/${landing}`)
    ? []
    : [`shadcn apply lands its helper at ${landing}, which the preset ships nowhere`];
}

export function designSystemInvariantsOf(item: PresetItem, shipped: PresetContents): string[] {
  if (item.designSystem !== 'shadcn') {
    return [];
  }

  const written = writtenTo(item, shipped, DESIGN_SYSTEM_CONFIG);

  if (written === undefined) {
    return ['the shadcn preset writes no components.json for apply to read'];
  }

  return landingInvariants(item, written);
}
