import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { configInvariantsOf } from './config-invariants.ts';
import { contentInvariantsOf } from './contents-invariants.ts';
import { declarationInvariantsOf } from './declaration-invariants.ts';
import { integrationInvariantsOf } from './integration-invariants.ts';
import { lawInvariantsOf } from './law-invariants.ts';
import { mutationScopeInvariantsOf } from './mutation-invariants.ts';
import { pipelineInvariantsOf } from './pipeline-invariants.ts';
import { ringInvariantsOf } from './ring-invariants.ts';

export interface PresetSubject {
  item: PresetItem;
  semantics: PresetSemantics;
  carried: PresetContents;
  shipped: PresetContents;
  harnessSkills: string[];
}

export function brokenInvariantsOf(subject: PresetSubject): string[] {
  return [
    ...contentInvariantsOf(subject.item, subject.carried, subject.shipped),
    ...declarationInvariantsOf(subject.item, subject.semantics),
    ...ringInvariantsOf(subject.semantics),
    ...integrationInvariantsOf(subject.item),
    ...pipelineInvariantsOf(subject.item, subject.semantics, subject.shipped),
    ...configInvariantsOf(subject.item, subject.shipped),
    ...mutationScopeInvariantsOf(subject.item, subject.semantics, subject.shipped),
    ...lawInvariantsOf(subject.item, subject.shipped, subject.harnessSkills),
  ];
}
