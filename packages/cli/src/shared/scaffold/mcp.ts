import type { PresetMcpServer } from '@ket/preset';

import type { ScaffoldFile } from '../write-files.ts';

import { heldRecordIn, isRecord } from './held.ts';

export const MCP_FILE = '.mcp.json';

const SERVERS_FIELD = 'mcpServers';

function serversUnder(file: Record<string, unknown>): Record<string, unknown> {
  const servers = file[SERVERS_FIELD];

  return isRecord(servers) ? servers : {};
}

function asEntry(server: PresetMcpServer): [string, { type: 'http'; url: string }] {
  return [server.name, { type: 'http', url: server.url }];
}

export function mcpFileOf(held: string, servers: PresetMcpServer[]): ScaffoldFile | undefined {
  const file = heldRecordIn(held);
  const registered = serversUnder(file);
  const missing = servers.filter((server) => !Object.hasOwn(registered, server.name));

  if (missing.length === 0) {
    return undefined;
  }

  const merged = {
    ...file,
    [SERVERS_FIELD]: { ...registered, ...Object.fromEntries(missing.map(asEntry)) },
  };

  return { path: MCP_FILE, contents: `${JSON.stringify(merged, undefined, 2)}\n` };
}
