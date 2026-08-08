import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';

import type { Configuration, PresetName } from './configuration.ts';

import { PRESET_NAMES } from './configuration.ts';
import { KET_DIRECTORY } from './locate.ts';
import { DEFAULT_LANGUAGE } from './scaffold/language.ts';
import { heldInYaml } from './yaml-source.ts';

export const CONFIGURATION_FILE = 'config.yaml';

export type ConfigurationReading =
  | { absent: true }
  | { refusals: string[] }
  | { configuration: Configuration };

type Settled<Value> = { value: Value } | { refusals: string[] };

export function renderConfiguration(configuration: Configuration): string {
  return stringify({
    key: configuration.key,
    targets: configuration.targets,
    integrations: configuration.integrations,
    language: configuration.language,
    workflow: configuration.workflow,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPreset(value: unknown): value is PresetName {
  return PRESET_NAMES.some((known) => known === value);
}

function keyIn(held: Record<string, unknown>): Settled<string> {
  const declared = held['key'];

  return typeof declared === 'string' && declared !== ''
    ? { value: declared }
    : { refusals: ['the configuration declares no project key'] };
}

function governedTargets(declared: Record<string, unknown>): Settled<Record<string, PresetName>> {
  const governed: Record<string, PresetName> = {};
  const refusals: string[] = [];

  for (const [directory, preset] of Object.entries(declared)) {
    if (isPreset(preset)) {
      governed[directory] = preset;
    } else {
      refusals.push(`the target ${directory} names ${String(preset)}, which ket does not govern`);
    }
  }

  return refusals.length > 0 ? { refusals } : { value: governed };
}

function targetsIn(held: Record<string, unknown>): Settled<Record<string, PresetName>> {
  const declared = held['targets'];

  if (!isRecord(declared) || Object.keys(declared).length === 0) {
    return { refusals: ['the configuration maps no directory to a preset'] };
  }

  return governedTargets(declared);
}

function namesOf(declared: unknown): string[] | undefined {
  if (!Array.isArray(declared)) {
    return undefined;
  }

  const entries: unknown[] = declared;
  const names = entries.filter((entry) => typeof entry === 'string');

  return names.length === entries.length ? names : undefined;
}

function integrationsIn(held: Record<string, unknown>): Settled<string[]> {
  const declared = held['integrations'];

  if (declared === undefined || declared === null) {
    return { value: [] };
  }

  const names = namesOf(declared);

  return names === undefined
    ? { refusals: ['the integrations are not a list of names'] }
    : { value: names };
}

function languageIn(held: Record<string, unknown>): Settled<string> {
  const declared = held['language'];

  if (declared === undefined || declared === null) {
    return { value: DEFAULT_LANGUAGE };
  }

  return typeof declared === 'string'
    ? { value: declared }
    : { refusals: ['the language is not a name'] };
}

function workflowIn(held: Record<string, unknown>): Settled<boolean> {
  const declared = held['workflow'];

  if (declared === undefined || declared === null) {
    return { value: true };
  }

  return typeof declared === 'boolean'
    ? { value: declared }
    : { refusals: ['the workflow is not true or false'] };
}

function refusalsAmong(settled: Settled<unknown>[]): string[] {
  return settled.flatMap((one) => ('refusals' in one ? one.refusals : []));
}

type Declared = Pick<Configuration, 'key' | 'targets'>;

type Chosen = Pick<Configuration, 'integrations' | 'language' | 'workflow'>;

function declaredIn(held: Record<string, unknown>): Settled<Declared> {
  const key = keyIn(held);
  const targets = targetsIn(held);

  if ('refusals' in key || 'refusals' in targets) {
    return { refusals: refusalsAmong([key, targets]) };
  }

  return { value: { key: key.value, targets: targets.value } };
}

function chosenIn(held: Record<string, unknown>): Settled<Chosen> {
  const integrations = integrationsIn(held);
  const language = languageIn(held);
  const workflow = workflowIn(held);

  if ('refusals' in integrations || 'refusals' in language || 'refusals' in workflow) {
    return { refusals: refusalsAmong([integrations, language, workflow]) };
  }

  return {
    value: {
      integrations: integrations.value,
      language: language.value,
      workflow: workflow.value,
    },
  };
}

function readingOf(held: Record<string, unknown>): ConfigurationReading {
  const declared = declaredIn(held);
  const chosen = chosenIn(held);

  if ('refusals' in declared || 'refusals' in chosen) {
    return { refusals: refusalsAmong([declared, chosen]) };
  }

  return { configuration: { ...declared.value, ...chosen.value } };
}

export function readConfiguration(source: string | undefined): ConfigurationReading {
  if (source === undefined) {
    return { absent: true };
  }

  const parsed = heldInYaml(source, 'configuration');

  if ('refusals' in parsed) {
    return parsed;
  }

  return isRecord(parsed.held)
    ? readingOf(parsed.held)
    : { refusals: ['the configuration is not a mapping of settings'] };
}

export async function configurationIn(root: string): Promise<ConfigurationReading> {
  const source = await readFile(join(root, KET_DIRECTORY, CONFIGURATION_FILE), 'utf8').then(
    (text) => text,
    () => undefined,
  );

  return readConfiguration(source);
}
