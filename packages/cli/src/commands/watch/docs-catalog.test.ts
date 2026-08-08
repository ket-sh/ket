import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DocsCatalog, DocsPageRow } from './docs-catalog.ts';

import { stampOf } from '../../shared/docs-stamp.ts';
import { docsCatalogFor } from './docs-catalog.ts';

let root = '';

async function git(...flags: string[]): Promise<void> {
  return new Promise((done, failed) => {
    const scoped = ['-C', root, '-c', 'user.email=ada@test', '-c', 'user.name=Ada Lovelace'];

    execFile('git', [...scoped, ...flags], (broke) => {
      if (broke === null) {
        done();
      } else {
        failed(new Error(broke.message));
      }
    });
  });
}

async function wrote(path: string, content: string): Promise<void> {
  await mkdir(join(root, dirname(path)), { recursive: true });
  await writeFile(join(root, path), content);
}

async function committed(message: string, at = '2026-08-07T10:00:00Z'): Promise<void> {
  await git('add', '.');
  await git('commit', '--date', at, '-m', message);
}

function fronted(lines: string[], body = '# Page\n'): string {
  return ['---', ...lines, '---', '', body].join('\n');
}

function pageRows(catalog: DocsCatalog): DocsPageRow[] {
  return catalog.groups
    .flatMap((group) => group.rows)
    .flatMap((row) => (row.kind === 'page' ? [row] : []));
}

function pageNamed(catalog: DocsCatalog, name: string): DocsPageRow | undefined {
  return pageRows(catalog).find((row) => row.name === name);
}

type DocsAnyRow = DocsCatalog['groups'][number]['rows'][number];

function drawnNodes(catalog: DocsCatalog): Extract<DocsAnyRow, { kind: 'node' }>[] {
  const drawn = catalog.groups.find((group) => group.label === 'architecture');

  return (drawn?.rows ?? []).flatMap((row) => (row.kind === 'node' ? [row] : []));
}

const KEEPER_SOURCE = 'export const keeper = true;\n';

async function pinnedKeeperPage(): Promise<void> {
  await wrote('src/keeper.ts', KEEPER_SOURCE);
  await wrote(
    'docs/keeper.md',
    fronted([
      'category: reference',
      'sources:',
      '  - src/**',
      `stamp: ${stampOf([{ path: 'src/keeper.ts', content: KEEPER_SOURCE }])}`,
    ]),
  );
  await committed('docs: pin the keeper page');
}

const SHARED_ANCHOR = '#packagescli-shared';

const SKELETON_PAGE = fronted(
  ['category: reference'],
  [
    '# Architecture skeleton',
    '## packages/cli',
    '### packages/cli commands/watch',
    'Depends on:',
    `- [packages/cli shared](${SHARED_ANCHOR})`,
    '### packages/cli shared',
    'Depends on nothing inside the workspace.',
  ].join('\n'),
);

const INTENT_PAGE = fronted(
  ['category: explanation'],
  [
    '# Architecture intent',
    '## Commands are islands',
    `Shared holds the floor: [shared](skeleton.md${SHARED_ANCHOR}).`,
  ].join('\n'),
);

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-docs-catalog-'));
  await git('init', '-b', 'main');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the shelves the catalog groups pages onto', () => {
  it('groups the pages by their category, worn in the diátaxis order', async () => {
    await wrote('docs/why.md', fronted(['category: explanation']));
    await wrote('docs/first-steps.md', fronted(['category: tutorial']));
    await wrote('docs/handbook.md', fronted(['category: reference']));
    await wrote('docs/upgrade.md', fronted(['category: how-to']));
    await committed('docs: file the pages');

    const catalog = await docsCatalogFor(root);

    expect(catalog.groups.map((group) => group.label)).toEqual([
      'tutorial',
      'how-to',
      'reference',
      'explanation',
    ]);
    expect(pageNamed(catalog, 'first-steps')?.rot).toBe('unpinned');
  });

  it('leaves a group off the shelf when no page wears its category', async () => {
    await wrote('docs/handbook.md', fronted(['category: reference']));
    await committed('docs: file the handbook');

    const catalog = await docsCatalogFor(root);

    expect(catalog.groups.map((group) => group.label)).toEqual(['reference']);
  });
});

describe('the rot a page row wears', () => {
  it('reads a page whose stamp still covers its sources as fresh', async () => {
    await pinnedKeeperPage();

    expect(pageNamed(await docsCatalogFor(root), 'keeper')?.rot).toBe('fresh');
  });

  it('turns a page stale once its sources move past the stamp', async () => {
    await pinnedKeeperPage();
    await wrote('src/keeper.ts', 'export const keeper = false;\n');
    await committed('feat: flip the keeper');

    const row = pageNamed(await docsCatalogFor(root), 'keeper');

    expect(row?.rot).toBe('stale');
    expect(row?.sources).toEqual(['src/**']);
  });
});

describe('the broken rows the catalog keeps on screen', () => {
  it('renders unreadable frontmatter as a broken row rather than refusing', async () => {
    await wrote('docs/mangled.md', '---\nsources: everywhere\n---\n\n# Mangled\n');
    await committed('docs: mangle a page');

    const catalog = await docsCatalogFor(root);
    const row = pageNamed(catalog, 'mangled');

    expect(catalog.groups.map((group) => group.label)).toEqual(['uncategorized']);
    expect(row?.rot).toBe('broken');
    expect(row?.broken).toMatch(/sources/u);
    expect(row?.sources).toEqual([]);
  });

  it('renders a sources list matching no tracked file as broken, naming the globs', async () => {
    await wrote(
      'docs/askew.md',
      fronted([
        'category: reference',
        'sources:',
        '  - nowhere/**',
        '  - elsewhere/**',
        'stamp: abc123def456',
      ]),
    );
    await committed('docs: pin a page to nothing');

    const row = pageNamed(await docsCatalogFor(root), 'askew');

    expect(row?.rot).toBe('broken');
    expect(row?.broken).toContain('nowhere/**, elsewhere/**');
  });
});

describe('the records the catalog shelves whole', () => {
  it('shelves the ADRs as their own group of records', async () => {
    await wrote('docs/adr/0001-first-call.md', '# 1. First call\n');
    await wrote('docs/adr/0002-second-call.md', '# 2. Second call\n');
    await committed('docs: record two calls');

    const catalog = await docsCatalogFor(root);
    const records = catalog.groups.find((group) => group.label === 'adr');

    expect(records?.rows.map((row) => (row.kind === 'record' ? row.name : row.kind))).toEqual([
      '0001-first-call',
      '0002-second-call',
    ]);
  });
});

describe('the provenance a row names', () => {
  it('names the last commit that touched a page', async () => {
    await wrote('docs/handbook.md', fronted(['category: reference']));
    await committed('docs: file the handbook', '2026-08-06T08:00:00Z');
    await wrote('docs/handbook.md', fronted(['category: reference'], '# Toured again\n'));
    await committed('docs: rewrite the tour (#70)', '2026-08-07T09:30:00Z');

    const touch = pageNamed(await docsCatalogFor(root), 'handbook')?.touch;

    expect(touch?.by).toBe('Ada Lovelace');
    expect(touch?.subject).toBe('docs: rewrite the tour (#70)');
    expect(touch?.at.startsWith('2026-08-07T09:30:00')).toBe(true);
  });
});

describe('the architecture the catalog draws', () => {
  it('draws the nodes with their edges and the intent pointing at them', async () => {
    await wrote('docs/architecture/skeleton.md', SKELETON_PAGE);
    await wrote('docs/architecture/intent.md', INTENT_PAGE);
    await committed('docs: draw the skeleton');

    const nodes = drawnNodes(await docsCatalogFor(root));

    expect(nodes.map((node) => node.name)).toEqual([
      'packages/cli commands/watch',
      'packages/cli shared',
    ]);
    expect(nodes[0]?.edges).toEqual(['packages/cli shared']);
    expect(nodes[0]?.pointers).toEqual([]);
    expect(nodes[1]?.pointers).toEqual(['Commands are islands']);
  });

  it('leaves the architecture off the shelf while the skeleton stays untracked', async () => {
    await wrote('docs/handbook.md', fronted(['category: reference']));
    await committed('docs: file the handbook');
    await wrote('docs/architecture/skeleton.md', SKELETON_PAGE);
    await wrote('docs/architecture/intent.md', INTENT_PAGE);

    const catalog = await docsCatalogFor(root);

    expect(catalog.groups.map((group) => group.label)).toEqual(['reference']);
  });

  it('draws nodes wearing no pointers while no intent page is tracked', async () => {
    await wrote('docs/architecture/skeleton.md', SKELETON_PAGE);
    await committed('docs: draw the skeleton alone');

    const nodes = drawnNodes(await docsCatalogFor(root));

    expect(nodes.map((node) => node.pointers)).toEqual([[], []]);
  });
});

describe('the repositories the catalog tolerates', () => {
  it('leaves an uncommitted page invisible until the repository tracks it', async () => {
    await wrote('docs/drafted.md', fronted(['category: reference']));

    expect((await docsCatalogFor(root)).groups).toEqual([]);
  });

  it('comes back empty outside a repository rather than refusing', async () => {
    const bare = await mkdtemp(join(tmpdir(), 'ket-docs-bare-'));

    expect((await docsCatalogFor(bare)).groups).toEqual([]);
    await rm(bare, { recursive: true, force: true });
  });
});
