import { spawnSync } from 'node:child_process';

import type { DependencyGraph } from './skeleton.mts';

import { parseDependencyGraph } from './skeleton.mts';

const DEPCRUISE_ARGS = [
  'packages',
  'presets',
  '--config',
  '.dependency-cruiser.cjs',
  '--output-type',
  'json',
];

export function readDependencyGraph(): DependencyGraph {
  const cruised = spawnSync('./node_modules/.bin/depcruise', DEPCRUISE_ARGS, {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (cruised.error !== undefined) {
    throw new Error(`depcruise did not run: ${cruised.error.message}`);
  }

  if (cruised.status !== 0) {
    throw new Error(`depcruise refused the graph: ${cruised.stderr}`);
  }

  return parseDependencyGraph(cruised.stdout);
}
