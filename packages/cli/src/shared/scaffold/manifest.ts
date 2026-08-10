import type { Configuration } from '../configuration.ts';
import type { RegisteredPreset } from '../registry.ts';
import type { ScaffoldFile } from '../write-files.ts';

import { governingPresets } from '../registry.ts';
import { isRecord } from './held.ts';
import { installsFor } from './integrations.ts';
import { dictionaryInstallsFor } from './language.ts';

export interface ManifestSource {
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

export const MANIFEST_FILE = 'package.json';

const BUN_FLOOR = '>=1.3.14';

const BLOCKS: readonly string[] = ['scripts', 'dependencies', 'devDependencies'];

const NOTHING_SHIPPED: ManifestSource = { dependencies: [], devDependencies: [], scripts: {} };

function splitPin(pin: string): [string, string] {
  const at = pin.lastIndexOf('@');

  return [pin.slice(0, at), pin.slice(at + 1)];
}

function asRanges(pins: string[]): Record<string, string> {
  return Object.fromEntries(
    pins.map(splitPin).toSorted(([left], [right]) => left.localeCompare(right)),
  );
}

function manifestOf(name: string, source: ManifestSource): Record<string, unknown> {
  return {
    name,
    type: 'module',
    scripts: source.scripts,
    dependencies: asRanges(source.dependencies),
    devDependencies: asRanges(source.devDependencies),
    engines: { bun: BUN_FLOOR },
  };
}

function rendered(manifest: Record<string, unknown>): string {
  return `${JSON.stringify(manifest, undefined, 2)}\n`;
}

export function renderManifest(name: string, source: ManifestSource): string {
  return rendered(manifestOf(name, source));
}

function shippedBy(governing: RegisteredPreset | undefined): ManifestSource {
  return governing === undefined
    ? NOTHING_SHIPPED
    : {
        dependencies: governing.item.dependencies,
        devDependencies: governing.item.devDependencies,
        scripts: governing.semantics.scripts,
      };
}

export function manifestSourceFor(configuration: Configuration): ManifestSource {
  const targets = Object.values(configuration.targets);
  const [governing] = governingPresets(targets);
  const shipped = shippedBy(governing);

  return {
    dependencies: shipped.dependencies,
    devDependencies: [
      ...shipped.devDependencies,
      ...installsFor(targets, configuration.integrations),
      ...dictionaryInstallsFor(configuration.language),
    ],
    scripts: shipped.scripts,
  };
}

function blockIn(manifest: Record<string, unknown>, field: string): Record<string, unknown> {
  const held = manifest[field];

  return isRecord(held) ? held : {};
}

function absentIn(
  held: Record<string, unknown>,
  fresh: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fresh).filter(([field]) => !Object.hasOwn(held, field)));
}

function mergedBlocks(
  held: Record<string, unknown>,
  fresh: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    BLOCKS.map((field) => {
      const holds = blockIn(held, field);

      return [field, { ...holds, ...absentIn(holds, blockIn(fresh, field)) }];
    }),
  );
}

type HeldManifest = { holds: Record<string, unknown> } | { refused: string };

function heldManifestOf(held: string): HeldManifest {
  let parsed: unknown;

  try {
    parsed = JSON.parse(held);
  } catch {
    return { refused: `${MANIFEST_FILE} cannot be read, so nothing merges into it` };
  }

  if (!isRecord(parsed)) {
    return { refused: `${MANIFEST_FILE} holds no record, so nothing merges into it` };
  }

  const broken = BLOCKS.find((field) => Object.hasOwn(parsed, field) && !isRecord(parsed[field]));

  return broken === undefined
    ? { holds: parsed }
    : {
        refused: `${MANIFEST_FILE} holds ${broken} in no state to merge, so nothing merges into it`,
      };
}

function mergedManifestFile(
  manifest: Record<string, unknown>,
  name: string,
  source: ManifestSource,
): ScaffoldFile | undefined {
  const fresh = manifestOf(name, source);
  const merged = {
    ...manifest,
    ...absentIn(manifest, fresh),
    ...mergedBlocks(manifest, fresh),
  };
  const contents = rendered(merged);

  return contents === rendered(manifest) ? undefined : { path: MANIFEST_FILE, contents };
}

export function manifestFileOf(
  held: string,
  name: string,
  source: ManifestSource,
): ScaffoldFile | { refused: string } | undefined {
  if (held === '') {
    return mergedManifestFile({}, name, source);
  }

  const reading = heldManifestOf(held);

  return 'refused' in reading ? reading : mergedManifestFile(reading.holds, name, source);
}
