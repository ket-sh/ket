import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { matchesGlob } from 'node:path';
import process from 'node:process';

const MUTATION_CONFIG = 'stryker.conf.json';

const FULL_BATTERY = 'bun run test:mutation:full';

const EXCLUSION = '!';

const TEST_SUFFIX = /(\.[a-z]+)?\.test\.(ts|tsx)$/u;

function refuse(reason: string): never {
  console.error(reason);
  process.exit(1);
}

function skip(reason: string): never {
  console.log(reason);
  process.exit(0);
}

function git(args: string[]): string | undefined {
  const asked = spawnSync('git', args, { encoding: 'utf8' });

  return asked.status === 0 ? asked.stdout.trim() : undefined;
}

function resolves(reference: string): boolean {
  return git(['rev-parse', '--verify', '--quiet', reference]) !== undefined;
}

function askedBase(): string | undefined {
  const argued = process.argv.indexOf('--base');

  if (argued === -1) {
    return undefined;
  }

  return process.argv[argued + 1] ?? refuse('--base names no reference to diff against');
}

function baseBranch(): string {
  const asked = askedBase();

  if (asked !== undefined) {
    return resolves(asked)
      ? asked
      : refuse(`${asked} resolves to no commit; fetch it, or run ${FULL_BATTERY}`);
  }

  return (
    ['origin/main', 'main'].find(resolves) ??
    skip(
      `no main to diff against yet, so the scoped mutation gate skips; ${FULL_BATTERY} runs everything`,
    )
  );
}

function changedAgainst(base: string): string[] {
  const ancestor =
    git(['merge-base', base, 'HEAD']) ??
    refuse(`${base} and HEAD share no merge base; deepen the fetch, or run ${FULL_BATTERY}`);
  const committed =
    git(['diff', '--name-only', '--diff-filter=d', ancestor]) ??
    refuse(`git cannot diff the working tree against ${ancestor}`);
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? '';

  return [...new Set(`${committed}\n${untracked}`.split('\n'))].filter((path) => path !== '');
}

function isConfigRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readsRecord(written: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(written);

  return isConfigRecord(parsed)
    ? parsed
    : refuse(`${MUTATION_CONFIG} holds no configuration object`);
}

function patternsIn(config: Record<string, unknown>): string[] {
  const declared = config['mutate'];

  if (!Array.isArray(declared)) {
    refuse(`${MUTATION_CONFIG} names no mutate patterns, so nothing says what the gate measures`);
  }

  return declared.filter((entry: unknown): entry is string => typeof entry === 'string');
}

function testConfigIn(config: Record<string, unknown>): string[] {
  const runner = config['vitest'];

  if (runner === null || typeof runner !== 'object' || !('configFile' in runner)) {
    return [];
  }

  return typeof runner.configFile === 'string' ? [runner.configFile] : [];
}

function mutable(path: string, patterns: string[]): boolean {
  const excluded = patterns
    .filter((pattern) => pattern.startsWith(EXCLUSION))
    .some((pattern) => matchesGlob(path, pattern.slice(EXCLUSION.length)));
  const included = patterns
    .filter((pattern) => !pattern.startsWith(EXCLUSION))
    .some((pattern) => matchesGlob(path, pattern));

  return included && !excluded;
}

function sourcesBehind(path: string): string[] {
  return TEST_SUFFIX.test(path) ? [path, path.replace(TEST_SUFFIX, '.$2')] : [path];
}

function runsStryker(mutate: string[]): never {
  const ran = spawnSync('./node_modules/.bin/stryker', ['run', ...mutate], { stdio: 'inherit' });

  process.exit(ran.status ?? 1);
}

const written = existsSync(MUTATION_CONFIG)
  ? readFileSync(MUTATION_CONFIG, 'utf8')
  : refuse(`${MUTATION_CONFIG} is not here; the mutation gate runs from the project root`);
const config = readsRecord(written);
const base = baseBranch();
const changed = changedAgainst(base);
const gateItself = [MUTATION_CONFIG, ...testConfigIn(config)];

if (changed.some((path) => gateItself.includes(path))) {
  console.log('the mutation gate itself changed, so the whole battery answers for it');
  runsStryker([]);
}

const patterns = patternsIn(config);
const scope = [...new Set(changed.flatMap(sourcesBehind))]
  .filter((path) => existsSync(path))
  .filter((path) => mutable(path, patterns))
  .toSorted();

if (scope.length === 0) {
  console.log(
    `nothing ${MUTATION_CONFIG} mutates changed against ${base}; ${FULL_BATTERY} runs everything`,
  );
  process.exit(0);
}

console.log(
  `mutating what changed against ${base}:\n${scope.map((path) => `  ${path}`).join('\n')}`,
);
runsStryker(['--mutate', scope.join(',')]);
