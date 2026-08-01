import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { declarationInvariantsOf } from './declaration-invariants.ts';
import { writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: ['citty@0.1.6'],
  devDependencies: ['oxlint@1.76.0', '@stylistic/eslint-plugin@5.10.0', 'cucumber@13.2.0'],
  files: [writes('lefthook.yml', 'lefthook.yml')],
  integrations: [],
};

const SEMANTICS: PresetSemantics = {
  scripts: {
    lint: 'oxlint .',
    'check-types': 'tsc --noEmit',
    test: 'vitest run',
    'test:mutation': 'stryker run',
  },
  slice: { roots: ['src/commands/{slice}'], adapters: ['command.ts'] },
  tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [
    { script: 'lint', guards: 'It checks style.', commitJob: 'lint', ciJob: 'check' },
    { script: 'check-types', guards: 'It checks types.', commitJob: '', ciJob: 'check' },
    { script: 'test', guards: 'It checks behavior.', commitJob: '', ciJob: 'check' },
    { script: 'test:mutation', guards: 'It checks the suite.', commitJob: '', ciJob: 'mutation' },
  ],
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [{ runs: 'oxlint', scope: 'file' }],
    two: [{ runs: 'tsc --noEmit', scope: 'project' }],
  },
  testRuntime: 'vitest',
};

function brokenWhen(semantics: Partial<PresetSemantics>): string[] {
  return declarationInvariantsOf(ITEM, { ...SEMANTICS, ...semantics });
}

describe('a preset that declares itself soundly', () => {
  it('breaks nothing', () => {
    expect(declarationInvariantsOf(ITEM, SEMANTICS)).toStrictEqual([]);
  });
});

describe('the gate chain a preset declares', () => {
  it('names a preset that guards nothing at all', () => {
    expect(brokenWhen({ gates: [] })).toContain(
      'the preset declares no gate, so a project under it is guarded by nothing',
    );
  });

  it('names a gate whose script the preset never declares', () => {
    const gates = [
      ...SEMANTICS.gates,
      { script: 'lint:dead', guards: 'It finds it.', commitJob: '', ciJob: 'check' },
    ];

    expect(brokenWhen({ gates })).toContain(
      'the gate lint:dead names no script the preset declares, so nothing runs it',
    );
  });

  it('names a gate that says nothing about what it guards', () => {
    const gates = SEMANTICS.gates.map((gate) =>
      gate.script === 'test' ? { ...gate, guards: '' } : gate,
    );

    expect(brokenWhen({ gates })).toContain('the gate test says nothing about what it guards');
  });

  it('names a description too wide for the table that shows it', () => {
    const guards = `It checks ${'a'.repeat(40)}.`;
    const gates = SEMANTICS.gates.map((gate) =>
      gate.script === 'test' ? { ...gate, guards } : gate,
    );

    expect(brokenWhen({ gates })).toContain(
      'the gate test describes itself in 51 characters, and the table it shows in holds 42',
    );
  });

  it('names a description written as a fragment rather than a sentence', () => {
    const gates = SEMANTICS.gates.map((gate) =>
      gate.script === 'test' ? { ...gate, guards: 'checks behavior' } : gate,
    );

    expect(brokenWhen({ gates })).toContain(
      'the gate test describes itself as `checks behavior`, and a description reads `It ....`',
    );
  });
});

describe("the chain a preset's gates add up to", () => {
  it('names two gates that describe themselves the same way', () => {
    const gates = SEMANTICS.gates.map((gate) =>
      gate.script === 'test' ? { ...gate, guards: 'It checks style.' } : gate,
    );

    expect(brokenWhen({ gates })).toContain(
      'the gates lint and test describe themselves the same way, so one of them is the other',
    );
  });

  it('names a chain that leaves out the mutation gate the product turns on', () => {
    const gates = SEMANTICS.gates.filter((gate) => gate.script !== 'test:mutation');

    expect(brokenWhen({ gates })).toContain(
      'the preset declares no test:mutation gate, and that is the gate this product is for',
    );
  });

  it('names a chain that leaves out the linter', () => {
    const gates = SEMANTICS.gates.filter((gate) => gate.script !== 'lint');

    expect(brokenWhen({ gates })).toContain(
      'the preset declares no lint gate, and that is the gate this product is for',
    );
  });
});

describe('how a gate is made to describe itself', () => {
  function guardedBy(guards: string): string[] {
    return brokenWhen({
      gates: SEMANTICS.gates.map((gate) => (gate.script === 'test' ? { ...gate, guards } : gate)),
    });
  }

  it('accepts a description that fills the table exactly', () => {
    expect(guardedBy(`It checks ${'a'.repeat(31)}.`)).toStrictEqual([]);
  });

  it('refuses a description one character past the table', () => {
    expect(guardedBy(`It checks ${'a'.repeat(32)}.`)).toStrictEqual([
      'the gate test describes itself in 43 characters, and the table it shows in holds 42',
    ]);
  });

  it('refuses a description that opens in lowercase', () => {
    expect(guardedBy('it checks behavior.')).toStrictEqual([
      'the gate test describes itself as `it checks behavior.`, and a description reads `It ....`',
    ]);
  });

  it('refuses a description that capitalises the verb after It', () => {
    expect(guardedBy('It Checks behavior.')).toStrictEqual([
      'the gate test describes itself as `It Checks behavior.`, and a description reads `It ....`',
    ]);
  });

  it('refuses a description that stops without a full stop', () => {
    expect(guardedBy('It checks behavior')).toStrictEqual([
      'the gate test describes itself as `It checks behavior`, and a description reads `It ....`',
    ]);
  });

  it('refuses a description that reaches the sentence only partway in', () => {
    expect(guardedBy('Checks It checks behavior.')).toStrictEqual([
      'the gate test describes itself as `Checks It checks behavior.`, and a description reads `It ....`',
    ]);
  });

  it('refuses a description that carries on past the full stop', () => {
    expect(guardedBy('It checks behavior. Really')).toStrictEqual([
      'the gate test describes itself as `It checks behavior. Really`, and a description reads `It ....`',
    ]);
  });

  it('refuses a description that is the word It and nothing after it', () => {
    expect(guardedBy('It.')).toStrictEqual([
      'the gate test describes itself as `It.`, and a description reads `It ....`',
    ]);
  });
});

describe('the scripts a preset declares', () => {
  it('names a script declared with nothing to run', () => {
    expect(brokenWhen({ scripts: { ...SEMANTICS.scripts, dev: '' } })).toContain(
      'the preset declares the script dev with no command to run',
    );
  });
});

describe('what a preset says about its own tests', () => {
  it('names a preset whose two suites would land in one file', () => {
    const tests = { example: '{unit}.test.ts', property: '{unit}.test.ts' };

    expect(brokenWhen({ tests })).toContain(
      'the preset names the example suite and the property suite the same, so one overwrites the other',
    );
  });

  it('names an example pattern that marks nowhere for the unit name', () => {
    const tests = { example: 'spec.ts', property: '{unit}.property.test.ts' };

    expect(brokenWhen({ tests })).toContain(
      'the preset names the example suite spec.ts, which marks nowhere for the unit name',
    );
  });

  it('names a property pattern that marks nowhere for the unit name', () => {
    const tests = { example: '{unit}.test.ts', property: 'property.test.ts' };

    expect(brokenWhen({ tests })).toContain(
      'the preset names the property suite property.test.ts, which marks nowhere for the unit name',
    );
  });
});

describe('what a preset says answers for it in a browser or a shell', () => {
  it('names a preset that says nothing about what drives its acceptance', () => {
    expect(brokenWhen({ acceptance: { runner: '', drives: 'browser' } })).toContain(
      'the preset names no acceptance runner, so nothing drives what a person would',
    );
  });

  it('names a preset that says nothing about what its acceptance drives', () => {
    expect(brokenWhen({ acceptance: { runner: 'playwright', drives: '' } })).toContain(
      'the preset says its acceptance drives nothing, and a runner drives something',
    );
  });
});

describe('the shape a preset declares itself in', () => {
  it('names a lockfile written as a path rather than a name', () => {
    expect(brokenWhen({ lockfile: 'packages/bun.lock' })).toContain(
      'the preset names the lockfile packages/bun.lock, and a workspace keeps one in any directory',
    );
  });

  it('names a preset that declares no lockfile at all', () => {
    expect(brokenWhen({ lockfile: '' })).toContain(
      'the preset names no lockfile, so nothing says what a frozen install reads',
    );
  });

  it('names a preset that says nothing about where a hermetic test writes', () => {
    expect(brokenWhen({ substrate: '' })).toContain(
      'the preset names no substrate, so nothing says where a hermetic test writes',
    );
  });

  it('names a slice rooted nowhere', () => {
    expect(brokenWhen({ slice: { roots: [], adapters: ['command.ts'] } })).toContain(
      'the preset roots a slice nowhere, so no directory holds one',
    );
  });

  it('names a slice that calls nothing an adapter', () => {
    expect(brokenWhen({ slice: { roots: ['src/{slice}'], adapters: [] } })).toContain(
      'the preset calls nothing in a slice an adapter, so mutation would measure its side effects',
    );
  });

  it('names a slice root that marks nowhere for the slice name', () => {
    expect(brokenWhen({ slice: { roots: ['src/commands'], adapters: ['command.ts'] } })).toContain(
      'the preset roots a slice at src/commands, which marks nowhere for the slice name',
    );
  });
});
