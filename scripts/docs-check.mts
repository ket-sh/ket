import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type { PinnedPage } from './docs/pinning.mts';

import { readDependencyGraph } from './docs/dependency-graph.mts';
import { isDocCategory, parsePage } from './docs/frontmatter.mts';
import { compiledOutputs, GLOSSARY_PATH } from './docs/glossary-outputs.mts';
import { missingAnchors } from './docs/intent-anchors.mts';
import { governedDocPages } from './docs/pages.mts';
import { pageState } from './docs/pinning.mts';
import { changedFiles, trackedFiles } from './docs/repository.mts';
import { renderSkeleton } from './docs/skeleton.mts';
import { sourcesOf } from './docs/stamp.mts';

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

function movedSources(pinned: PinnedPage, changed: readonly string[]): string {
  const moved = sourcesOf(changed, pinned.page.sources);

  if (moved.length === 0) {
    return `sources: ${pinned.page.sources.join(', ')}`;
  }

  return `sources that moved:\n${moved.map((path) => `- ${path}`).join('\n')}`;
}

function rotFailures(files: readonly string[], changed: readonly string[]): string[] {
  return governedDocPages(files)
    .map((path) => pageState(path, files))
    .flatMap((state) => (state.kind === 'stale' ? [state.pinned] : []))
    .map((pinned) =>
      [
        `${pinned.path} went stale: its sources moved past the stamp`,
        movedSources(pinned, changed),
        `reread the page, update what the change made stale, then run bun run docs:stamp ${pinned.path}`,
      ].join('\n'),
    );
}

function categoryFailures(files: readonly string[]): string[] {
  return governedDocPages(files)
    .filter((path) => !isDocCategory(parsePage(readFileSync(path, 'utf-8')).category))
    .map(
      (path) =>
        `${path} declares no category: add category: tutorial, how-to, reference, or explanation to its frontmatter`,
    );
}

function glossaryFailures(): string[] {
  return compiledOutputs()
    .filter((output) => readFileSync(output.path, 'utf-8') !== output.content)
    .map(
      (output) =>
        `${output.path} is stale against ${GLOSSARY_PATH}: run bun run docs:glossary and commit the result`,
    );
}

function baseSha(): string | undefined {
  const sha = process.env['BASE_SHA'];

  return sha === undefined || sha === '' ? undefined : sha;
}

const committedSkeleton = readFileSync(SKELETON_PATH, 'utf-8');
const files = trackedFiles();
const failures = [
  ...skeletonDrift(committedSkeleton, renderSkeleton(readDependencyGraph())),
  ...deadAnchors(committedSkeleton),
  ...rotFailures(files, changedFiles(baseSha())),
  ...categoryFailures(files),
  ...glossaryFailures(),
];

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

console.log('docs checks passed');
