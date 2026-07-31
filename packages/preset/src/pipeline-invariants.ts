import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

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

export function pipelineInvariantsOf(
  item: PresetItem,
  semantics: PresetSemantics,
  shipped: PresetContents,
): string[] {
  const declared = jobsThePipelineDeclares(item, shipped);
  const claimed = new Set(semantics.gates.map((gate) => gate.ciJob));

  return [
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
