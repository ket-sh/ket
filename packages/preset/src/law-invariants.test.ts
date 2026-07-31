import { describe, expect, it } from 'vitest';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { writes } from './item.ts';
import { lawInvariantsOf } from './law-invariants.ts';

const HARNESS_SKILLS = ['tdd', 'gates', 'mutation'];

const LOCKFILE = JSON.stringify({
  version: 1,
  skills: { vitest: { source: 'antfu/skills' } },
});

const LAW = 'Read the `tdd` skill before a test, and the `vitest` skill for the runner.\n';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [writes('CLAUDE.md', 'CLAUDE.md'), writes('skills-lock.json', 'skills-lock.json')],
  integrations: [],
};

const SHIPPED: PresetContents = {
  'files/CLAUDE.md': LAW,
  'files/skills-lock.json': LOCKFILE,
};

describe('the standing law a preset writes into a project', () => {
  it('breaks nothing when every skill it names is one the project gets', () => {
    expect(lawInvariantsOf(ITEM, SHIPPED, HARNESS_SKILLS)).toStrictEqual([]);
  });

  it('breaks when a preset writes no standing law at all', () => {
    expect(lawInvariantsOf({ ...ITEM, files: [] }, {}, HARNESS_SKILLS)).toStrictEqual([
      'the preset writes no standing law, so an agent in a project under it is governed by nothing',
    ]);
  });

  it('breaks when a preset writes a standing law but records no skill to go with it', () => {
    expect(
      lawInvariantsOf(
        { ...ITEM, files: [writes('CLAUDE.md', 'CLAUDE.md')] },
        { 'files/CLAUDE.md': LAW },
        HARNESS_SKILLS,
      ),
    ).toStrictEqual([
      'the preset writes a standing law but no skills lockfile, so nothing records what a project under it installs',
    ]);
  });

  it('reports the lockfile it cannot read rather than the skills it then cannot find', () => {
    expect(
      lawInvariantsOf(ITEM, { ...SHIPPED, 'files/skills-lock.json': 'not a lockfile' }, []),
    ).toStrictEqual(['the skills lockfile is not json anything can read']);
  });
});

describe('the skills a standing law points an agent at', () => {
  it('names the skill the standing law points at when nothing ships it', () => {
    const law = 'Use the `javascript-testing-patterns` skill for unit work.\n';

    expect(
      lawInvariantsOf(ITEM, { ...SHIPPED, 'files/CLAUDE.md': law }, HARNESS_SKILLS),
    ).toStrictEqual([
      'the standing law names the javascript-testing-patterns skill, which neither the harness nor the lockfile the preset writes ships',
    ]);
  });

  it('names every skill the standing law points at in vain, not the first of them', () => {
    const law = 'Use the `turborepo` skill, then the `opentui` skill.\n';

    expect(
      lawInvariantsOf(ITEM, { ...SHIPPED, 'files/CLAUDE.md': law }, HARNESS_SKILLS),
    ).toStrictEqual([
      'the standing law names the turborepo skill, which neither the harness nor the lockfile the preset writes ships',
      'the standing law names the opentui skill, which neither the harness nor the lockfile the preset writes ships',
    ]);
  });

  it('counts a skill the lockfile installs as one the standing law may name', () => {
    const law = 'Use the `vitest` skill for the runner.\n';

    expect(lawInvariantsOf(ITEM, { ...SHIPPED, 'files/CLAUDE.md': law }, [])).toStrictEqual([]);
  });

  it('counts a skill the harness ships as one the standing law may name', () => {
    const law = 'Use the `mutation` skill when a mutant survives.\n';
    const empty = JSON.stringify({ version: 1, skills: {} });

    expect(
      lawInvariantsOf(
        ITEM,
        { 'files/CLAUDE.md': law, 'files/skills-lock.json': empty },
        HARNESS_SKILLS,
      ),
    ).toStrictEqual([]);
  });
});
