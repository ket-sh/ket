import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { writtenTo } from './contents.ts';

const DESIGN_SYSTEM_CONFIG = '~/components.json';

const ALIASED = '@/';

const SOURCE_ROOT = 'src/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function utilsAliasIn(written: string): string | undefined {
  const parsed: unknown = JSON.parse(written);
  const aliases = isRecord(parsed) ? parsed['aliases'] : undefined;
  const utils = isRecord(aliases) ? aliases['utils'] : undefined;

  return typeof utils === 'string' ? utils : undefined;
}

// shadcn apply derives no lib path of its own: it takes the directory the
// utils alias resolves into and lands lib/utils.ts there. A preset shipping
// no file at that landing leaves apply room to write a second helper, at a
// path the boundary gate then refuses at the scaffold's first commit.
function landingBehind(alias: string): string {
  const aliased = `${alias.slice(0, alias.lastIndexOf('/'))}/utils.ts`;

  return aliased.replace(ALIASED, SOURCE_ROOT);
}

function landingInvariants(item: PresetItem, written: string): string[] {
  const alias = utilsAliasIn(written);

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
