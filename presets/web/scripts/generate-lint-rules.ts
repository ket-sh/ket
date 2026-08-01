import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import plugin from 'oxlint-plugin-react-doctor';

// react-doctor grades every rule by the framework it applies to. A TanStack
// Start application is none of react-native, nextjs or preact, and a rule
// written for one of those reports on code this preset never writes.
const APPLIES = new Set(['global', 'tanstack-start', 'tanstack-query']);

// The rule reads a project using the classic JSX transform, and the tsconfig
// this preset writes asks for the automatic one. It is wrong here, not lax.
const CLASSIC_TRANSFORM_ONLY = 'react-in-jsx-scope';

const CONFIG = join(import.meta.dirname, '..', 'files', 'oxlintrc.json');

const NAMESPACE = 'react-doctor/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function severityOf(rule: unknown): string {
  const declared = isRecord(rule) ? rule['severity'] : undefined;

  return declared === 'error' ? 'error' : 'warn';
}

function appliesTo(rule: unknown): boolean {
  const framework = isRecord(rule) ? rule['framework'] : undefined;

  return typeof framework === 'string' && APPLIES.has(framework);
}

function ruleNamesOf(loaded: unknown): string[] {
  const rules = isRecord(loaded) ? loaded['rules'] : undefined;

  if (!isRecord(rules)) {
    throw new Error('oxlint-plugin-react-doctor exposes no rules to read');
  }

  return Object.keys(rules);
}

function selected(loaded: unknown): [string, string][] {
  const rules = isRecord(loaded) && isRecord(loaded['rules']) ? loaded['rules'] : {};

  return ruleNamesOf(loaded)
    .filter((name) => name !== CLASSIC_TRANSFORM_ONLY && appliesTo(rules[name]))
    .toSorted((left, right) => left.localeCompare(right))
    .map((name) => [`${NAMESPACE}${name}`, severityOf(rules[name])]);
}

const written: unknown = JSON.parse(await readFile(CONFIG, 'utf8'));

if (!isRecord(written) || !isRecord(written['rules'])) {
  throw new Error(`${CONFIG} declares no rules to write into`);
}

const kept = Object.entries(written['rules']).filter(([name]) => !name.startsWith(NAMESPACE));
const picked = selected(plugin);

await writeFile(
  CONFIG,
  `${JSON.stringify({ ...written, rules: Object.fromEntries([...kept, ...picked]) }, undefined, 2)}\n`,
  'utf8',
);

process.stdout.write(
  `${String(picked.length)} react-doctor rules written to files/oxlintrc.json\n`,
);
