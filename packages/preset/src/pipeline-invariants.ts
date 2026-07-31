import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { writtenTo } from './contents.ts';

const WORKFLOW_DIRECTORY = '~/.github/workflows/';

const JOBS_BLOCK = '\njobs:\n';

const JOB_LINE = /^ {2}(\S+):$/u;

function jobIn(line: string): string | undefined {
  return JOB_LINE.exec(line)?.[1];
}

function jobsIn(workflow: string): string[] {
  return workflow
    .split(JOBS_BLOCK)
    .slice(1)
    .flatMap((block) => block.split('\n'))
    .map(jobIn)
    .filter((job): job is string => job !== undefined);
}

function jobsThePipelineDeclares(item: PresetItem, shipped: PresetContents): string[] {
  return item.files
    .filter((file) => file.target.startsWith(WORKFLOW_DIRECTORY))
    .map((file) => shipped[file.path])
    .filter((written): written is string => written !== undefined)
    .flatMap(jobsIn);
}

const HOOKS = '~/lefthook.yml';

// A commit hook runs jobs in stages, and only the one before a message exists
// arms a gate. Reading past it would count a message check as a gate.
const AFTER_THE_WRITE = '\ncommit-msg:';

const HOOK_JOB = /(?<=- name: )\S+/gu;

function hookJobsIn(written: string): string[] {
  const message = written.indexOf(AFTER_THE_WRITE);
  const beforeTheMessage = message === -1 ? written : written.slice(0, message);

  return [...beforeTheMessage.matchAll(HOOK_JOB)].map((found) => found[0]);
}

function commitInvariants(
  item: PresetItem,
  semantics: PresetSemantics,
  shipped: PresetContents,
): string[] {
  const armed = semantics.gates.filter((gate) => gate.commitJob !== '');
  const written = writtenTo(item, shipped, HOOKS);

  if (written === undefined) {
    return armed.map(
      (gate) =>
        `the gate ${gate.script} names the commit job ${gate.commitJob}, and the preset writes no hook file at all`,
    );
  }

  const runs = hookJobsIn(written);

  return armed
    .filter((gate) => !runs.includes(gate.commitJob))
    .map(
      (gate) =>
        `the gate ${gate.script} names the commit job ${gate.commitJob}, which the hook file the preset writes never runs`,
    );
}

export function pipelineInvariantsOf(
  item: PresetItem,
  semantics: PresetSemantics,
  shipped: PresetContents,
): string[] {
  const declared = jobsThePipelineDeclares(item, shipped);
  const claimed = new Set(semantics.gates.map((gate) => gate.ciJob));

  return [
    ...commitInvariants(item, semantics, shipped),
    ...semantics.gates
      .filter((gate) => !declared.includes(gate.ciJob))
      .map(
        (gate) =>
          `the gate ${gate.script} names the pipeline job ${gate.ciJob}, which no workflow the preset writes declares`,
      ),
    ...declared
      .filter((job) => !claimed.has(job))
      .map((job) => `the pipeline job ${job} belongs to no gate the preset declares`),
  ];
}
