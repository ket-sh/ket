import { describe, expect, it } from 'vitest';

import type { PresetIntegration } from './item.ts';

import { filesOf, installsOf, reachesNothing, writes } from './item.ts';

const WRITING: PresetIntegration = {
  name: 'codeql',
  category: 'code scanning',
  asks: 'codeql scans a public repo free and a private one per committer.',
  files: [writes('github-codeql.yml', '.github/workflows/codeql.yml')],
};

const REACHING: PresetIntegration = {
  name: 'mobbin',
  category: 'design reference',
  asks: 'mobbin costs the same for a public repo and a private one.',
  reaches: { stage: 'designing', reference: 'https://mobbin.com' },
};

describe('what an integration brings a project', () => {
  it('names the files one that writes files brings', () => {
    expect(filesOf(WRITING)).toStrictEqual(WRITING.files);
  });

  it('names no file for one that reaches a stage instead', () => {
    expect(filesOf(REACHING)).toStrictEqual([]);
  });
});

describe('what an integration installs', () => {
  it('names the packages one that installs some brings', () => {
    const chromatic: PresetIntegration = {
      name: 'chromatic',
      category: 'visual review',
      asks: 'chromatic on a public repo and a private one.',
      installs: ['chromatic@13.4.0'],
      files: [writes('github-chromatic.yml', '.github/workflows/chromatic.yml')],
    };

    expect(installsOf(chromatic)).toStrictEqual(['chromatic@13.4.0']);
  });

  it('names nothing for one that brings only files', () => {
    expect(installsOf(WRITING)).toStrictEqual([]);
  });

  it('names nothing for one that reaches a stage instead', () => {
    expect(installsOf(REACHING)).toStrictEqual([]);
  });
});

describe('an integration that changes nothing at all', () => {
  it('reads one that writes files as changing something', () => {
    expect(reachesNothing(WRITING)).toBe(false);
  });

  it('reads one that reaches a stage as changing something', () => {
    expect(reachesNothing(REACHING)).toBe(false);
  });

  it('reads one that writes no file and reaches no stage as changing nothing', () => {
    const idle: PresetIntegration = {
      name: 'idle',
      category: 'coverage',
      asks: 'a public and a private repo.',
      files: [],
    };

    expect(reachesNothing(idle)).toBe(true);
  });
});
