import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { dependencyNamesOf } from './item.ts';

const TSCONFIG = '~/tsconfig.json';

const LINT_CONFIG = '~/.oxlintrc.json';

const PROSE_CONFIG = '~/.vale.ini';

const MUTATION_CONFIG = '~/stryker.conf.json';

const TYPES_SCOPE = '@types/';

// The prose tool supplies its own style and downloads Microsoft. Every other
// name in BasedOnStyles has to arrive as a file the preset writes.
const PROSE_TOOL_SUPPLIES = new Set(['Vale', 'Microsoft']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function configWritten(
  item: PresetItem,
  shipped: PresetContents,
  target: string,
): string | undefined {
  const file = item.files.find((candidate) => candidate.target === target);

  return file === undefined ? undefined : shipped[file.path];
}

function packagesNamedIn(written: string): string[] {
  const parsed: unknown = JSON.parse(written);
  const declared = isRecord(parsed) ? parsed['compilerOptions'] : undefined;
  const options = isRecord(declared) ? declared : {};
  const source = options['jsxImportSource'];
  const types = options['types'];

  return [...(typeof source === 'string' ? [source] : []), ...(isStringArray(types) ? types : [])];
}

function typeInvariants(item: PresetItem, shipped: PresetContents): string[] {
  const written = configWritten(item, shipped, TSCONFIG);

  if (written === undefined) {
    return [];
  }

  const installed = new Set(dependencyNamesOf(item));

  return packagesNamedIn(written)
    .filter((named) => !installed.has(named) && !installed.has(`${TYPES_SCOPE}${named}`))
    .map(
      (named) => `the tsconfig the preset writes names ${named}, which the preset installs nowhere`,
    );
}

function pluginsNamedIn(written: string): string[] {
  const parsed: unknown = JSON.parse(written);
  const declared = isRecord(parsed) ? parsed['jsPlugins'] : undefined;

  if (!Array.isArray(declared)) {
    return [];
  }

  return declared
    .map((plugin: unknown) => (isRecord(plugin) ? plugin['specifier'] : undefined))
    .filter((specifier): specifier is string => typeof specifier === 'string');
}

function lintInvariants(item: PresetItem, shipped: PresetContents): string[] {
  const written = configWritten(item, shipped, LINT_CONFIG);

  if (written === undefined) {
    return [];
  }

  const installed = new Set(dependencyNamesOf(item));

  return pluginsNamedIn(written)
    .filter((specifier) => !installed.has(specifier))
    .map(
      (specifier) =>
        `the lint config the preset writes names the plugin ${specifier}, which the preset installs nowhere`,
    );
}

const ASSIGNMENT = '=';

function settingIn(configuration: string, key: string): string | undefined {
  const line = configuration.split('\n').find((entry) => entry.startsWith(`${key} ${ASSIGNMENT}`));

  return line === undefined ? undefined : line.slice(line.indexOf(ASSIGNMENT) + 1).trim();
}

function styleInvariants(item: PresetItem, written: string): string[] {
  const targets = item.files.map((file) => file.target);

  return (settingIn(written, 'BasedOnStyles') ?? '')
    .split(',')
    .map((style) => style.trim())
    .filter((style) => style !== '' && !PROSE_TOOL_SUPPLIES.has(style))
    .filter((style) => !targets.some((target) => target.startsWith(`~/.vale/styles/${style}/`)))
    .map(
      (style) =>
        `the prose config the preset writes names the style ${style}, which the preset ships nowhere`,
    );
}

function vocabularyInvariants(item: PresetItem, written: string): string[] {
  const named = settingIn(written, 'Vocab');

  if (named === undefined || named === '') {
    return ['the prose config the preset writes names no vocabulary'];
  }

  const accepted = `~/.vale/styles/config/vocabularies/${named}/accept.txt`;

  return item.files.some((file) => file.target === accepted)
    ? []
    : [
        `the prose config the preset writes names the vocabulary ${named}, which the preset ships nowhere`,
      ];
}

function proseInvariants(item: PresetItem, shipped: PresetContents): string[] {
  const written = configWritten(item, shipped, PROSE_CONFIG);

  return written === undefined
    ? []
    : [...styleInvariants(item, written), ...vocabularyInvariants(item, written)];
}

function testConfigNamedIn(written: string): string | undefined {
  const parsed: unknown = JSON.parse(written);
  const runner = isRecord(parsed) ? parsed['vitest'] : undefined;
  const named = isRecord(runner) ? runner['configFile'] : undefined;

  return typeof named === 'string' ? named : undefined;
}

function mutationInvariants(item: PresetItem, shipped: PresetContents): string[] {
  const written = configWritten(item, shipped, MUTATION_CONFIG);

  if (written === undefined) {
    return [];
  }

  const named = testConfigNamedIn(written);

  if (named === undefined) {
    return ['the mutation config the preset writes names no test config'];
  }

  return item.files.some((file) => file.target === `~/${named}`)
    ? []
    : [`the mutation config the preset writes names ${named}, which the preset ships nowhere`];
}

export function configInvariantsOf(item: PresetItem, shipped: PresetContents): string[] {
  return [
    ...typeInvariants(item, shipped),
    ...lintInvariants(item, shipped),
    ...proseInvariants(item, shipped),
    ...mutationInvariants(item, shipped),
  ];
}
