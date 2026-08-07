import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const resolveModulePath = createRequire(import.meta.url).resolve;

const PACKAGE_ROOT = join(import.meta.dirname, '..');

const SURFACE_ROOT = join(PACKAGE_ROOT, 'src', 'commands', 'item', 'surface');

const CLIENT_ROOT = join(SURFACE_ROOT, 'client');

const GENERATED = join(SURFACE_ROOT, 'styles.generated.ts');

// The compiled binary carries no node_modules and no loose sources, so every
// asset the surface serves gets baked into one module at generation time
// rather than resolved, read, or bundled at request time.
const COPIED = [
  ['DIFF_STYLES', resolveModulePath('diff2html/bundles/css/diff2html.min.css')],
  ['GRID_STYLES', resolveModulePath('gridstack/dist/gridstack.min.css')],
  ['SURFACE_STYLES', join(SURFACE_ROOT, 'surface.css')],
  ['GRID_SCRIPT', resolveModulePath('gridstack/dist/gridstack-all.js')],
] as const;

interface BundleMaker {
  build(options: { entrypoints: string[]; target: string }): Promise<{
    outputs: { text(): Promise<string> }[];
  }>;
}

function isBundleMaker(held: unknown): held is BundleMaker {
  return (
    typeof held === 'object' && held !== null && 'build' in held && typeof held.build === 'function'
  );
}

function bundleMaker(): BundleMaker {
  const held: unknown = Reflect.get(globalThis, 'Bun');

  if (!isBundleMaker(held)) {
    throw new Error('refused: the surface styles generate under bun');
  }

  return held;
}

async function bundledClient(): Promise<string> {
  const built = await bundleMaker().build({
    entrypoints: [join(CLIENT_ROOT, 'main.ts')],
    target: 'browser',
  });
  const [output] = built.outputs;

  if (output === undefined) {
    throw new Error('refused: the client bundle came out empty');
  }

  return output.text();
}

async function clientSources(): Promise<string[]> {
  const names = await readdir(CLIENT_ROOT);

  return names.filter((name) => name.endsWith('.ts') && !name.includes('.test.')).sort();
}

async function clientFingerprint(): Promise<string> {
  const digest = createHash('sha256');

  for (const name of await clientSources()) {
    digest.update(name);
    digest.update(await readFile(join(CLIENT_ROOT, name), 'utf8'));
  }

  return digest.digest('hex');
}

async function moduleCarrying(): Promise<string> {
  const entries = [
    ...(await Promise.all(
      COPIED.map(async ([name, path]) => [name, await readFile(path, 'utf8')] as const),
    )),
    ['CLIENT_SCRIPT', await bundledClient()] as const,
    ['CLIENT_FINGERPRINT', await clientFingerprint()] as const,
  ];

  return entries
    .map(([name, contents]) => `export const ${name} = ${JSON.stringify(contents)};\n`)
    .join('\n');
}

await writeFile(GENERATED, await moduleCarrying());
