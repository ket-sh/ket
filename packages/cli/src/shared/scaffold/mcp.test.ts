import type { PresetMcpServer } from '@ket/preset';

import { describe, expect, it } from 'vitest';

import type { ScaffoldFile } from '../write-files.ts';

import { MCP_FILE, mcpFileOf } from './mcp.ts';

const MOBBIN: PresetMcpServer = { name: 'mobbin', url: 'https://api.mobbin.com/mcp' };

function parsed(file: ScaffoldFile | undefined): unknown {
  if (file === undefined) {
    throw new Error('nothing was rendered to parse');
  }

  return JSON.parse(file.contents);
}

describe('registering a server in a project that has no file yet', () => {
  it('writes the server as an http entry under mcpServers', () => {
    expect(parsed(mcpFileOf('', [MOBBIN]))).toStrictEqual({
      mcpServers: { mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' } },
    });
  });

  it('lands where the agent runtime reads project servers', () => {
    expect(mcpFileOf('', [MOBBIN])?.path).toBe(MCP_FILE);
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(mcpFileOf('', [MOBBIN])?.contents.endsWith('\n')).toBe(true);
  });
});

describe('registering a server beside servers a project already has', () => {
  it('keeps every server the project added by hand', () => {
    const held = JSON.stringify({
      mcpServers: { figma: { type: 'http', url: 'https://figma.example/mcp' } },
    });

    expect(parsed(mcpFileOf(held, [MOBBIN]))).toStrictEqual({
      mcpServers: {
        figma: { type: 'http', url: 'https://figma.example/mcp' },
        mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' },
      },
    });
  });

  it('keeps every field beside the servers', () => {
    const held = JSON.stringify({ inputs: [{ id: 'token' }] });

    expect(parsed(mcpFileOf(held, [MOBBIN]))).toMatchObject({ inputs: [{ id: 'token' }] });
  });
});

describe('a project that already registered the server', () => {
  it('writes nothing, keeping the entry the project chose', () => {
    const held = JSON.stringify({
      mcpServers: { mobbin: { type: 'http', url: 'https://own.example/mcp' } },
    });

    expect(mcpFileOf(held, [MOBBIN])).toBeUndefined();
  });
});

describe('nothing to register', () => {
  it('writes nothing when no chosen integration brings a server', () => {
    expect(mcpFileOf('', [])).toBeUndefined();
  });
});

describe('a file left in no state to merge', () => {
  it('starts fresh rather than throwing on unreadable json', () => {
    expect(parsed(mcpFileOf('{ not json', [MOBBIN]))).toStrictEqual({
      mcpServers: { mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' } },
    });
  });

  it('starts fresh on a file that holds null', () => {
    expect(parsed(mcpFileOf('null', [MOBBIN]))).toStrictEqual({
      mcpServers: { mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' } },
    });
  });
});
