import type { PresetContents } from './contents.ts';
import type { HarnessSkills } from './harness-skills.ts';
import type { PresetItem } from './item.ts';

import { writtenTo } from './contents.ts';
import { skillsFrom } from './skills.ts';

const STANDING_LAW = '~/CLAUDE.md';

const PLAIN_LAW = '~/CLAUDE.plain.md';

const SKILLS_LOCKFILE = '~/skills-lock.json';

const PIPELINE_HEADING = '## The pipeline';

const SECTION_OPENER = '## ';

const PIPELINE_TRACES = ['/ket:', '.ket/items', 'ket watch'];

const QUOTE = '`';

const MENTION = '` skill';

const NAMED_SKILL = /`[a-z][a-z0-9-]*` skill/gu;

const NO_LAW =
  'the preset writes no standing law, so an agent in a project under it is governed by nothing';

const NO_LOCKFILE =
  'the preset writes a standing law but no skills lockfile, so nothing records what a project under it installs';

const NO_PLAIN_LAW =
  'the preset writes no plain law, so a project that declines the workflow is governed by nothing';

const NO_PIPELINE_SECTION =
  'the standing law carries no pipeline section for the plain law to drop';

const PLAIN_LAW_DRIFTED = 'the plain law is not the standing law with its pipeline section dropped';

function skillsNamedIn(law: string): string[] {
  return [...law.matchAll(NAMED_SKILL)].map((found) =>
    found[0].slice(QUOTE.length, -MENTION.length),
  );
}

function withoutPipelineSection(law: string): string | undefined {
  const lines = law.split('\n');
  const opened = lines.findIndex((line) => line === PIPELINE_HEADING);

  if (opened === -1) {
    return undefined;
  }

  const rest = lines.slice(opened + 1);
  const next = rest.findIndex((line) => line.startsWith(SECTION_OPENER));
  const following = next === -1 ? [] : rest.slice(next);

  return [...lines.slice(0, opened), ...following].join('\n');
}

function pairInvariants(law: string, plain: string): string[] {
  const dropped = withoutPipelineSection(law);

  if (dropped === undefined) {
    return [NO_PIPELINE_SECTION];
  }

  return dropped === plain ? [] : [PLAIN_LAW_DRIFTED];
}

function tracesKeptIn(plain: string): string[] {
  return PIPELINE_TRACES.filter((trace) => plain.includes(trace)).map(
    (trace) => `the plain law names ${trace}, which a project without the workflow never has`,
  );
}

interface LawReach {
  shipping: Set<string>;
  withoutTheWorkflow: Set<string>;
}

function workflowBoundSkillsIn(plain: string, reachable: LawReach): string[] {
  return skillsNamedIn(plain)
    .filter((named) => reachable.shipping.has(named) && !reachable.withoutTheWorkflow.has(named))
    .map((named) => `the plain law names the ${named} skill, which only the workflow bundle ships`);
}

function plainLawInvariantsOf(
  item: PresetItem,
  shipped: PresetContents,
  law: string,
  reachable: LawReach,
): string[] {
  const plain = writtenTo(item, shipped, PLAIN_LAW);

  if (plain === undefined) {
    return [NO_PLAIN_LAW];
  }

  return [
    ...pairInvariants(law, plain),
    ...tracesKeptIn(plain),
    ...workflowBoundSkillsIn(plain, reachable),
  ];
}

export function lawInvariantsOf(
  item: PresetItem,
  shipped: PresetContents,
  harnessSkills: HarnessSkills,
): string[] {
  const law = writtenTo(item, shipped, STANDING_LAW);

  if (law === undefined) {
    return [NO_LAW];
  }

  const lockfile = writtenTo(item, shipped, SKILLS_LOCKFILE);

  if (lockfile === undefined) {
    return [NO_LOCKFILE];
  }

  const locked = skillsFrom(lockfile);

  if ('unreadable' in locked) {
    return [locked.unreadable];
  }

  const installed = locked.skills.map((skill) => skill.name);
  const shipping = new Set([...harnessSkills.gates, ...harnessSkills.workflow, ...installed]);
  const withoutTheWorkflow = new Set([...harnessSkills.gates, ...installed]);

  return [
    ...plainLawInvariantsOf(item, shipped, law, { shipping, withoutTheWorkflow }),
    ...skillsNamedIn(law)
      .filter((named) => !shipping.has(named))
      .map(
        (named) =>
          `the standing law names the ${named} skill, which neither the harness nor the lockfile the preset writes ships`,
      ),
  ];
}
