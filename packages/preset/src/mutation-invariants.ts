import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { writtenTo } from './contents.ts';
import { adapterPatternsOf } from './semantics.ts';

const MUTATION_CONFIG = '~/stryker.conf.json';

const EXCLUDES = '!';

// The config is scanned rather than parsed, the way an item file and the event
// log already are. Parsing bought an exception path whose two spellings mean
// the same thing, and the readability of this file is already exercised where
// it is read for the test config it names.
function excludes(written: string, adapter: string): boolean {
  return written.includes(JSON.stringify(`${EXCLUDES}${adapter}`));
}

// An adapter is where side effects live, so mutating one asks a boundary to
// behave differently and gets an answer nobody can act on. The preset declares
// which paths those are; the config it ships has to agree.
export function mutationScopeInvariantsOf(
  item: PresetItem,
  semantics: PresetSemantics,
  shipped: PresetContents,
): string[] {
  const written = writtenTo(item, shipped, MUTATION_CONFIG);

  if (written === undefined) {
    return [];
  }

  return adapterPatternsOf(semantics)
    .filter((adapter) => !excludes(written, adapter))
    .map(
      (adapter) =>
        `the preset declares ${adapter} an adapter, and the mutation config it writes never excludes it`,
    );
}
