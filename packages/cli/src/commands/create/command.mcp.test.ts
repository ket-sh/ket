import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';
import { parseScaffoldRecord } from '../../shared/scaffold-manifest.ts';

const OBLIGING = `#!/bin/sh
mkdir -p ".claude/skills/$5"
printf 'installed\\n' > ".claude/skills/$5/SKILL.md"
exit 0
`;

let restored = '';
let sandbox = '';

async function readIfWritten(root: string, path: string): Promise<string | undefined> {
  return readFile(join(root, path), 'utf8').catch(() => undefined);
}

async function recordedPathsOn(root: string): Promise<string[]> {
  const record = parseScaffoldRecord((await readIfWritten(root, '.ket/scaffold.yaml')) ?? '');

  return Object.keys(record?.files ?? {});
}

beforeEach(async () => {
  restored = process.env['PATH'] ?? '';

  const stubs = await mkdtemp(join(tmpdir(), 'ket-create-stub-'));

  await writeFile(join(stubs, 'bunx'), OBLIGING, 'utf8');
  await chmod(join(stubs, 'bunx'), 0o755);
  process.env['PATH'] = `${stubs}:${restored}`;

  sandbox = await mkdtemp(join(tmpdir(), 'ket-create-mcp-'));
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env['PATH'] = restored;
});

describe('creating a web project that chose mobbin', () => {
  it('registers the hosted Mobbin server in the file the agent runtime reads', async () => {
    const where = join(sandbox, 'storefront');

    await runCommand('create', [where, '--preset', 'web', '--with', 'mobbin']);

    const written: unknown = JSON.parse((await readIfWritten(where, '.mcp.json')) ?? '{}');

    expect(written).toStrictEqual({
      mcpServers: { mobbin: { type: 'http', url: 'https://api.mobbin.com/mcp' } },
    });
  });

  it('keeps the registration out of the scaffold record, since a project adds its own servers there', async () => {
    const where = join(sandbox, 'storefront');

    await runCommand('create', [where, '--preset', 'web', '--with', 'mobbin']);

    const recorded = await recordedPathsOn(where);

    expect(recorded).not.toContain('.mcp.json');
    expect(recorded).toContain('CLAUDE.md');
  });
});

describe('creating a web project that chose no integration', () => {
  it('registers no server at all', async () => {
    const where = join(sandbox, 'plain');

    await runCommand('create', [where, '--preset', 'web']);

    expect(await readIfWritten(where, '.mcp.json')).toBeUndefined();
  });
});
