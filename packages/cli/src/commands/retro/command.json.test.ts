import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../../run.ts';

let where = '';
let lines: string[] = [];

function refusal(at: string): string {
  return `${JSON.stringify({
    gate: 'write',
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason: 'the test comes first',
  })}\n`;
}

async function governed(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ket-retro-json-'));

  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n',
  );
  await writeFile(
    join(root, '.ket', 'events.jsonl'),
    refusal('2026-08-04T11:00:00.000Z') + refusal('2026-08-04T12:00:00.000Z'),
  );

  return root;
}

beforeEach(async () => {
  where = await governed();
  lines = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function foldedFromStdout(): Promise<unknown> {
  await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z', '--json']);

  return JSON.parse(lines.join(''));
}

describe('asking a retro for the week as JSON', () => {
  it('carries the whole retro, drafts included, as one JSON document', async () => {
    expect(await foldedFromStdout()).toMatchObject({
      events: 2,
      actions: [
        {
          draft: {
            number: 1,
            sentence:
              '`write` refused 2 times: the test comes first; run `ket gate write` where the work starts',
          },
        },
      ],
    });
  });

  it('carries the evidence under the draft, moments and items included', async () => {
    expect(await foldedFromStdout()).toMatchObject({
      actions: [
        {
          draft: {
            evidence: {
              gate: 'write',
              reason: 'the test comes first',
              moments: ['2026-08-04T11:00:00.000Z', '2026-08-04T12:00:00.000Z'],
              items: ['K-1'],
            },
          },
        },
      ],
    });
  });

  it('prints JSON alone, with no report path around it', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z', '--json']);

    expect(lines.join('').startsWith('{')).toBe(true);
    expect(lines.join('').endsWith('}\n')).toBe(true);
  });

  it('writes no report file, since a JSON run is a read', async () => {
    await runCommand('retro', ['--cwd', where, '--since', '2026-08-03T00:00:00.000Z', '--json']);

    await expect(readFile(join(where, 'docs', 'retro'), 'utf8')).rejects.toThrow();
  });
});
