import type { DocsCatalogView } from '../../../shared/model';

export const DOCS: DocsCatalogView = {
  groups: [
    {
      label: 'reference',
      rows: [
        {
          kind: 'page',
          path: 'docs/handbook.md',
          name: 'handbook',
          category: 'reference',
          sources: ['packages/cli/src/**'],
          rot: 'fresh',
          broken: undefined,
          touch: {
            by: 'Ada Lovelace',
            at: '2026-08-07T11:00:00.000Z',
            subject: 'docs: rewrite the tour (#70)',
          },
        },
        {
          kind: 'page',
          path: 'docs/upgrade.md',
          name: 'upgrade',
          category: 'reference',
          sources: ['scripts/**'],
          rot: 'stale',
          broken: undefined,
          touch: undefined,
        },
      ],
    },
    {
      label: 'explanation',
      rows: [
        {
          kind: 'page',
          path: 'docs/why.md',
          name: 'why',
          category: 'explanation',
          sources: [],
          rot: 'unpinned',
          broken: undefined,
          touch: undefined,
        },
      ],
    },
    {
      label: 'uncategorized',
      rows: [
        {
          kind: 'page',
          path: 'docs/mangled.md',
          name: 'mangled',
          category: undefined,
          sources: [],
          rot: 'broken',
          broken: 'frontmatter sources must be a list',
          touch: undefined,
        },
      ],
    },
    {
      label: 'adr',
      rows: [
        {
          kind: 'record',
          path: 'docs/adr/0001-first-call.md',
          name: '0001-first-call',
          touch: undefined,
        },
      ],
    },
    {
      label: 'architecture',
      rows: [
        {
          kind: 'node',
          name: 'cli shared',
          anchor: 'cli-shared',
          edges: ['tui root'],
          pointers: ['Commands are islands'],
        },
      ],
    },
  ],
};
