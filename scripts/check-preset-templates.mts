import { spawnSync } from 'node:child_process';
import process from 'node:process';

const TEMPLATE_PATH = /^presets\/([^/]+)\/files\//u;

function presetsTouchedBy(paths: string[]): string[] {
  const names = paths
    .map((path) => TEMPLATE_PATH.exec(path)?.[1])
    .filter((name): name is string => name !== undefined);

  return [...new Set(names)].sort();
}

function ranIn(cwd: string, command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, { cwd, encoding: 'utf-8' });

  if (result.error !== undefined) {
    return result.error.message;
  }

  if (result.status !== 0) {
    return `${result.stdout}${result.stderr}`.trim();
  }

  return undefined;
}

function staleTemplates(name: string, said: string): string {
  return [
    `${name}'s generated contents are stale.`,
    said,
    `cd presets/${name} && bun run generate, then stage the result.`,
  ].join('\n');
}

function redSuite(name: string, said: string): string {
  return [`${name}'s suite is red.`, said, `cd presets/${name} && bun run test`].join('\n');
}

const GENERATED_PATHS = ['src/contents.generated.ts', 'files/oxlintrc.json'];

function checkPreset(name: string): string | undefined {
  const root = `presets/${name}`;
  const generated = ranIn(root, 'bun', ['run', 'generate']);

  if (generated !== undefined) {
    return staleTemplates(name, generated);
  }

  const diffed = ranIn(process.cwd(), 'git', [
    'diff',
    '--exit-code',
    '--',
    ...GENERATED_PATHS.map((path) => `${root}/${path}`),
  ]);

  if (diffed !== undefined) {
    return staleTemplates(name, diffed);
  }

  const tested = ranIn(root, 'bun', ['run', 'test']);

  return tested === undefined ? undefined : redSuite(name, tested);
}

const staged = process.argv.slice(2);
const presets = presetsTouchedBy(staged);
const failures = presets
  .map(checkPreset)
  .filter((message): message is string => message !== undefined);

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
