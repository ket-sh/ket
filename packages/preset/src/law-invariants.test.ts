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

const BODY = 'Read the `tdd` skill before a test, and the `vitest` skill for the runner.\n';

const TAIL = '## The gates\n\nNo gate here gets switched off to reach green.\n';

function standingLawOver(body: string, tail: string): string {
  return `${body}\n## The pipeline\n\nWork is an item in \`.ket/items/\`, and \`.ket/BOARD.md\` follows. Drive it with \`/ket:feature\`.\n\n${tail}`;
}

function plainLawOver(body: string, tail: string): string {
  return `${body}\n${tail}`;
}

function pairOver(body: string, tail: string = TAIL): PresetContents {
  return {
    'files/CLAUDE.md': standingLawOver(body, tail),
    'files/CLAUDE.plain.md': plainLawOver(body, tail),
  };
}

const LAW = standingLawOver(BODY, TAIL);

const PLAIN_LAW = plainLawOver(BODY, TAIL);

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [
    writes('CLAUDE.md', 'CLAUDE.md'),
    writes('CLAUDE.plain.md', 'CLAUDE.plain.md'),
    writes('skills-lock.json', 'skills-lock.json'),
  ],
  integrations: [],
};

const SHIPPED: PresetContents = {
  'files/CLAUDE.md': LAW,
  'files/CLAUDE.plain.md': PLAIN_LAW,
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

describe('the plain law a preset writes for a project that declines the workflow', () => {
  it('breaks when the preset writes no plain law at all', () => {
    expect(
      lawInvariantsOf(
        {
          ...ITEM,
          files: [writes('CLAUDE.md', 'CLAUDE.md'), writes('skills-lock.json', 'skills-lock.json')],
        },
        SHIPPED,
        HARNESS_SKILLS,
      ),
    ).toStrictEqual([
      'the preset writes no plain law, so a project that declines the workflow is governed by nothing',
    ]);
  });

  it('breaks when the standing law carries no pipeline section for the plain law to drop', () => {
    expect(
      lawInvariantsOf(
        ITEM,
        { ...SHIPPED, 'files/CLAUDE.md': BODY, 'files/CLAUDE.plain.md': BODY },
        HARNESS_SKILLS,
      ),
    ).toStrictEqual(['the standing law carries no pipeline section for the plain law to drop']);
  });

  it('breaks when the plain law is not the standing law with the pipeline dropped', () => {
    const drifted = plainLawOver(`${BODY}\nAn extra rule the standing law never carries.\n`, TAIL);

    expect(
      lawInvariantsOf(ITEM, { ...SHIPPED, 'files/CLAUDE.plain.md': drifted }, HARNESS_SKILLS),
    ).toStrictEqual(['the plain law is not the standing law with its pipeline section dropped']);
  });

  it('holds when the pipeline section is the last one the standing law carries', () => {
    expect(
      lawInvariantsOf(
        ITEM,
        {
          ...SHIPPED,
          'files/CLAUDE.md': `${BODY}\n## The pipeline\n\nDrive it with \`/ket:feature\`.\n`,
          'files/CLAUDE.plain.md': BODY,
        },
        HARNESS_SKILLS,
      ),
    ).toStrictEqual([]);
  });
});

describe('the pipeline traces a plain law must never keep', () => {
  it('names each pipeline trace the plain law keeps', () => {
    const tail = '## The gates\n\n`/ket:status` reads `.ket/items/` and `.ket/BOARD.md`.\n';

    expect(
      lawInvariantsOf(ITEM, { ...SHIPPED, ...pairOver(BODY, tail) }, HARNESS_SKILLS),
    ).toStrictEqual([
      'the plain law names /ket:, which a project without the workflow never has',
      'the plain law names .ket/items, which a project without the workflow never has',
      'the plain law names BOARD.md, which a project without the workflow never has',
    ]);
  });
});

describe('the skills a standing law points an agent at', () => {
  it('names the skill the standing law points at when nothing ships it', () => {
    const body = 'Use the `javascript-testing-patterns` skill for unit work.\n';

    expect(lawInvariantsOf(ITEM, { ...SHIPPED, ...pairOver(body) }, HARNESS_SKILLS)).toStrictEqual([
      'the standing law names the javascript-testing-patterns skill, which neither the harness nor the lockfile the preset writes ships',
    ]);
  });

  it('names every skill the standing law points at in vain, not the first of them', () => {
    const body = 'Use the `turborepo` skill, then the `opentui` skill.\n';

    expect(lawInvariantsOf(ITEM, { ...SHIPPED, ...pairOver(body) }, HARNESS_SKILLS)).toStrictEqual([
      'the standing law names the turborepo skill, which neither the harness nor the lockfile the preset writes ships',
      'the standing law names the opentui skill, which neither the harness nor the lockfile the preset writes ships',
    ]);
  });

  it('counts a skill the lockfile installs as one the standing law may name', () => {
    const body = 'Use the `vitest` skill for the runner.\n';

    expect(lawInvariantsOf(ITEM, { ...SHIPPED, ...pairOver(body) }, [])).toStrictEqual([]);
  });

  it('counts a skill the harness ships as one the standing law may name', () => {
    const body = 'Use the `mutation` skill when a mutant survives.\n';
    const empty = JSON.stringify({ version: 1, skills: {} });

    expect(
      lawInvariantsOf(ITEM, { ...pairOver(body), 'files/skills-lock.json': empty }, HARNESS_SKILLS),
    ).toStrictEqual([]);
  });
});
