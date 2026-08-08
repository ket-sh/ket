import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { readDependencyGraph } from './docs/dependency-graph.mts';
import { missingAnchors } from './docs/intent-anchors.mts';
import { renderSkeleton } from './docs/skeleton.mts';

const SKELETON_PATH = 'docs/architecture/skeleton.md';

const INTENT_PATH = 'docs/architecture/intent.md';

function skeletonDrift(committed: string, expected: string): string[] {
  if (committed === expected) {
    return [];
  }

  const regenerated = join(mkdtempSync(join(tmpdir(), 'ket-skeleton-')), 'skeleton.md');

  writeFileSync(regenerated, expected);

  const diffed = spawnSync('git', ['diff', '--no-index', '--', SKELETON_PATH, regenerated], {
    encoding: 'utf-8',
  });

  return [
    `the code moved and ${SKELETON_PATH} did not: run bun run docs:architecture and commit the result\n${diffed.stdout}`,
  ];
}

function deadAnchors(committed: string): string[] {
  const intent = readFileSync(INTENT_PATH, 'utf-8');

  return missingAnchors(intent, committed).map(
    (anchor) => `${INTENT_PATH} points at a skeleton node that no longer exists: ${anchor}`,
  );
}

const committedSkeleton = readFileSync(SKELETON_PATH, 'utf-8');
const failures = [
  ...skeletonDrift(committedSkeleton, renderSkeleton(readDependencyGraph())),
  ...deadAnchors(committedSkeleton),
];

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log('docs checks passed');
