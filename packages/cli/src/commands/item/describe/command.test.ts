import { runCommand as runCitty } from 'citty';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { describeItem } from './command.ts';

const FILED =
  'title: The parent epic\nkind: feature\nsize: epic\nstatus: designing\nchildren:\n  - K-2\n  - K-3\ndescription: |\n  unknown: where the cut falls\n';

const RATIONALE = 'Slice rationale\n\nK-2 carries the form, K-3 the lockout notice.';

let root = '';
let lines: string[] = [];

function itemPath(key: string): string {
  return join(root, '.ket', 'items', key, 'item.yaml');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-describe-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets: {}\n');
  await writeFile(itemPath('K-1'), FILED);
  lines = [];
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

async function runDescribe(argv: string[]): Promise<void> {
  await runCitty(describeItem, { rawArgs: argv });
}

describe('the describe command', () => {
  it('describes itself and takes the item key with the two ways prose arrives', () => {
    expect(describeItem.meta).toMatchObject({
      name: 'describe',
      description: 'Fill or replace the description a filed item carries',
    });
    expect(describeItem.args).toMatchObject({
      key: { type: 'positional', required: true, description: 'The item to describe' },
      description: { type: 'string', description: 'The prose to store' },
      file: { type: 'string', description: 'A file holding the prose to store' },
    });
  });
});

describe('replacing the description an item was filed with', () => {
  it('writes the prose in the block the store already reads, leaving the fields alone', async () => {
    await runDescribe(['K-1', '--description', RATIONALE]);

    expect(await readFile(itemPath('K-1'), 'utf8')).toBe(
      'title: The parent epic\nkind: feature\nsize: epic\nstatus: designing\nchildren:\n  - K-2\n  - K-3\ndescription: |\n  Slice rationale\n\n  K-2 carries the form, K-3 the lockout notice.\n',
    );
  });

  it('says which item it described, so a caller reads it back', async () => {
    await runDescribe(['K-1', '--description', RATIONALE]);

    expect(lines).toEqual(['K-1 described\n']);
  });

  it('takes the prose out of the file the flag names', async () => {
    const path = join(root, 'rationale.md');

    await writeFile(path, `${RATIONALE}\n`, 'utf8');

    await runDescribe(['K-1', '--file', path]);

    expect(await readFile(itemPath('K-1'), 'utf8')).toContain(
      'description: |\n  Slice rationale\n\n  K-2 carries the form, K-3 the lockout notice.\n',
    );
  });
});

describe('the refusals describing an item makes', () => {
  it('refuses a key no filed item answers to, naming the key', async () => {
    await expect(runDescribe(['K-9', '--description', RATIONALE])).rejects.toThrow(/^K-9 /);
  });

  it('refuses prose that says nothing, and leaves the description standing', async () => {
    await expect(runDescribe(['K-1', '--description', '   '])).rejects.toThrow(
      'K-1 is not described: the prose is empty, and a description says what the work is',
    );
    expect(await readFile(itemPath('K-1'), 'utf8')).toBe(FILED);
  });

  it('refuses both flags at once, naming the item it left alone', async () => {
    await expect(
      runDescribe(['K-1', '--description', RATIONALE, '--file', join(root, 'rationale.md')]),
    ).rejects.toThrow(
      'K-1 is not described: --description and --file both say where the prose comes from',
    );
    expect(await readFile(itemPath('K-1'), 'utf8')).toBe(FILED);
  });
});
