import { describe, expect, it } from 'vitest';

import type { PresetIntegration } from './item.ts';

import {
  comes,
  filesOf,
  installsOf,
  mcpServersOf,
  reachesNothing,
  skillsOf,
  writes,
} from './item.ts';

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

const COMING: PresetIntegration = { name: 'figma', category: 'design tool', soon: true };

describe('an integration that arrives soon', () => {
  it('reads as coming, while one that offers anything reads as here', () => {
    expect(comes(COMING)).toBe(true);
    expect(comes(WRITING)).toBe(false);
    expect(comes(REACHING)).toBe(false);
  });

  it('brings a project nothing while it is still coming', () => {
    expect(filesOf(COMING)).toStrictEqual([]);
    expect(installsOf(COMING)).toStrictEqual([]);
    expect(skillsOf(COMING)).toStrictEqual([]);
    expect(mcpServersOf(COMING)).toStrictEqual([]);
  });
});

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

describe('the MCP servers an integration registers', () => {
  it('names the servers one that registers some brings', () => {
    const gallery: PresetIntegration = {
      name: 'mobbin',
      category: 'design reference',
      asks: 'mobbin costs the same for a public repo and a private one.',
      reaches: { stage: 'designing', reference: 'https://mobbin.com' },
      mcp: [{ name: 'mobbin', url: 'https://api.mobbin.com/mcp' }],
    };

    expect(mcpServersOf(gallery)).toStrictEqual([
      { name: 'mobbin', url: 'https://api.mobbin.com/mcp' },
    ]);
  });

  it('names nothing for one that brings only files', () => {
    expect(mcpServersOf(WRITING)).toStrictEqual([]);
  });

  it('names nothing for one that reaches a stage without a server', () => {
    expect(mcpServersOf(REACHING)).toStrictEqual([]);
  });
});

describe('an integration that changes nothing at all', () => {
  it('reads one that writes files as changing something', () => {
    expect(reachesNothing(WRITING)).toBe(false);
  });

  it('reads one that reaches a stage as changing something', () => {
    expect(reachesNothing(REACHING)).toBe(false);
  });

  it('reads one that only registers an MCP server as changing something', () => {
    const registering: PresetIntegration = {
      name: 'gallery',
      category: 'design reference',
      asks: 'a public and a private repo.',
      files: [],
      mcp: [{ name: 'gallery', url: 'https://gallery.example/mcp' }],
    };

    expect(reachesNothing(registering)).toBe(false);
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
