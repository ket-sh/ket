import type { PresetItem } from './item.ts';
import type { GateSemantics, PresetSemantics } from './semantics.ts';

import { SLICE_PLACEHOLDER, UNIT_PLACEHOLDER } from './semantics.ts';

// The gate table shows a description beside a command, and a terminal is the
// width it is. A longer one wraps and the table stops lining up.
const TABLE_WIDTH = 42;

const SENTENCE = /^It [a-z].*\.$/u;

// A gate is what this product sells. A preset may add to the chain, and a
// preset that drops one of these guards less than ket claims it does.
const REQUIRED_GATES = ['lint', 'check-types', 'test', 'test:mutation'];

const PIN_SEPARATOR = '@';

const RANGE_MARKS = ['^', '~', '>', '<', '*', '|', ' '];

function gateInvariants(gate: GateSemantics, semantics: PresetSemantics): string[] {
  if (!Object.hasOwn(semantics.scripts, gate.script)) {
    return [`the gate ${gate.script} names no script the preset declares, so nothing runs it`];
  }

  if (gate.guards === '') {
    return [`the gate ${gate.script} says nothing about what it guards`];
  }

  if (gate.guards.length > TABLE_WIDTH) {
    return [
      `the gate ${gate.script} describes itself in ${gate.guards.length} characters, and the table it shows in holds ${TABLE_WIDTH}`,
    ];
  }

  return SENTENCE.test(gate.guards)
    ? []
    : [
        `the gate ${gate.script} describes itself as \`${gate.guards}\`, and a description reads \`It ....\``,
      ];
}

function twinnedDescriptions(gates: GateSemantics[]): string[] {
  return gates.flatMap((gate, at) =>
    gates
      .slice(0, at)
      .filter((earlier) => earlier.guards === gate.guards)
      .map(
        (earlier) =>
          `the gates ${earlier.script} and ${gate.script} describe themselves the same way, so one of them is the other`,
      ),
  );
}

function chainInvariants(semantics: PresetSemantics): string[] {
  if (semantics.gates.length === 0) {
    return ['the preset declares no gate, so a project under it is guarded by nothing'];
  }

  const declared = semantics.gates.map((gate) => gate.script);

  return [
    ...semantics.gates.flatMap((gate) => gateInvariants(gate, semantics)),
    ...twinnedDescriptions(semantics.gates),
    ...REQUIRED_GATES.filter((required) => !declared.includes(required)).map(
      (required) =>
        `the preset declares no ${required} gate, and that is the gate this product is for`,
    ),
  ];
}

function scriptInvariants(semantics: PresetSemantics): string[] {
  return Object.entries(semantics.scripts)
    .filter(([, command]) => command === '')
    .map(([name]) => `the preset declares the script ${name} with no command to run`);
}

function testInvariants(semantics: PresetSemantics): string[] {
  const named: [string, string][] = [
    ['example', semantics.tests.example],
    ['property', semantics.tests.property],
  ];

  return [
    ...(semantics.tests.example === semantics.tests.property
      ? [
          'the preset names the example suite and the property suite the same, so one overwrites the other',
        ]
      : []),
    ...named
      .filter(([, pattern]) => !pattern.includes(UNIT_PLACEHOLDER))
      .map(
        ([which, pattern]) =>
          `the preset names the ${which} suite ${pattern}, which marks nowhere for the unit name`,
      ),
  ];
}

function rootInvariants(roots: string[]): string[] {
  if (roots.length === 0) {
    return ['the preset roots a slice nowhere, so no directory holds one'];
  }

  return roots
    .filter((root) => !root.includes(SLICE_PLACEHOLDER))
    .map((root) => `the preset roots a slice at ${root}, which marks nowhere for the slice name`);
}

function shapeInvariants(semantics: PresetSemantics): string[] {
  return [
    ...rootInvariants(semantics.slice.roots),
    ...(semantics.slice.adapters.length === 0
      ? [
          'the preset calls nothing in a slice an adapter, so mutation would measure its side effects',
        ]
      : []),
    ...(semantics.lockfile.includes('/')
      ? [
          `the preset names the lockfile ${semantics.lockfile}, and a workspace keeps one in any directory`,
        ]
      : []),
    ...(semantics.lockfile === ''
      ? ['the preset names no lockfile, so nothing says what a frozen install reads']
      : []),
    ...(semantics.substrate === ''
      ? ['the preset names no substrate, so nothing says where a hermetic test writes']
      : []),
  ];
}

// A pin is a name, an `@`, and a version with nothing else in it. A scoped
// package opens with an `@` of its own, so the separator is the last one.
function isPinned(installed: string): boolean {
  const at = installed.lastIndexOf(PIN_SEPARATOR);

  if (at <= 0) {
    return false;
  }

  const version = installed.slice(at + 1);

  return version !== '' && !RANGE_MARKS.some((mark) => version.includes(mark));
}

function installInvariants(item: PresetItem): string[] {
  return [...item.dependencies, ...item.devDependencies]
    .filter((installed) => !isPinned(installed))
    .map(
      (installed) => `the preset installs ${installed}, and a range moves a gate without a commit`,
    );
}

const RESOLVED_AS = 'ket-';

function introductionInvariants(item: PresetItem): string[] {
  return [
    ...(item.name.startsWith(RESOLVED_AS) && item.name.length > RESOLVED_AS.length
      ? []
      : [`the preset calls itself ${item.name}, and ket resolves a preset as ket-<target>`]),
    ...(item.title === '' ? ['the preset carries no title, and a listing shows one'] : []),
    ...(item.description === ''
      ? ['the preset carries no description, and a listing shows one']
      : []),
  ];
}

function acceptanceInvariants(semantics: PresetSemantics): string[] {
  return [
    ...(semantics.acceptance.runner === ''
      ? ['the preset names no acceptance runner, so nothing drives what a person would']
      : []),
    ...(semantics.acceptance.drives === ''
      ? ['the preset says its acceptance drives nothing, and a runner drives something']
      : []),
  ];
}

function registryInvariants(item: PresetItem): string[] {
  return item.$schema === ''
    ? ['the preset declares no schema, and a registry validates an item against one']
    : [];
}

const HOME_MARKER = '~/';

const SHIPPED_FROM = 'files/';

function collisions(item: PresetItem): string[] {
  return item.files.flatMap((file, at) =>
    item.files
      .slice(0, at)
      .filter((earlier) => earlier.target === file.target)
      .map(() => `the preset writes two files to ${file.target}, so one of them never arrives`),
  );
}

function fileInvariants(item: PresetItem): string[] {
  return [
    ...item.files
      .filter((file) => !file.target.startsWith(HOME_MARKER))
      .map(
        (file) => `the preset targets ${file.target}, and a target is written under ${HOME_MARKER}`,
      ),
    ...item.files
      .filter((file) => file.target === HOME_MARKER)
      .map(
        (file) =>
          `the preset targets ${file.target}, which is the repository rather than a file in it`,
      ),
    ...item.files
      .filter((file) => !file.path.startsWith(SHIPPED_FROM))
      .map(
        (file) =>
          `the preset ships ${file.path}, and a preset reads what it ships out of ${SHIPPED_FROM}`,
      ),
    ...collisions(item),
  ];
}

export function declarationInvariantsOf(item: PresetItem, semantics: PresetSemantics): string[] {
  return [
    ...chainInvariants(semantics),
    ...scriptInvariants(semantics),
    ...testInvariants(semantics),
    ...shapeInvariants(semantics),
    ...acceptanceInvariants(semantics),
    ...installInvariants(item),
    ...introductionInvariants(item),
    ...registryInvariants(item),
    ...fileInvariants(item),
  ];
}
