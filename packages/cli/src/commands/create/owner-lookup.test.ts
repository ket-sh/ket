import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { foundOwner } from './owner-lookup.ts';

const ANSWERING = `#!/bin/sh
test "$1" = "api" || exit 9
test "$2" = "user" || exit 9
test "$3" = "--jq" || exit 9
test "$4" = ".login" || exit 9
echo "reyz"
`;

const SIGNED_OUT = `#!/bin/sh
echo "gh: To get started, please run: gh auth login" >&2
exit 4
`;

const SILENT = `#!/bin/sh
exit 0
`;

const PATH_SEPARATOR = ':';

let restored = '';

async function githubThat(behaves: string): Promise<void> {
  const where = await mkdtemp(join(tmpdir(), 'ket-github-'));

  await writeFile(join(where, 'gh'), behaves, 'utf8');
  await chmod(join(where, 'gh'), 0o755);

  process.env['PATH'] = `${where}${PATH_SEPARATOR}${restored}`;
}

async function noGithubAtAll(): Promise<void> {
  process.env['PATH'] = await mkdtemp(join(tmpdir(), 'ket-nowhere-'));
}

beforeEach(() => {
  restored = process.env['PATH'] ?? '';
});

afterEach(() => {
  process.env['PATH'] = restored;
});

describe('finding out who owns the project about to be written', () => {
  it('reads the login the github cli answers with', async () => {
    await githubThat(ANSWERING);

    await expect(foundOwner(undefined)).resolves.toBe('reyz');
  });

  it('finds no owner when the github cli is there but nobody is signed in', async () => {
    await githubThat(SIGNED_OUT);

    await expect(foundOwner(undefined)).resolves.toBeUndefined();
  });

  it('finds no owner when the github cli succeeds and answers nothing', async () => {
    await githubThat(SILENT);

    await expect(foundOwner(undefined)).resolves.toBeUndefined();
  });

  it('finds no owner rather than failing when the machine has no github cli', async () => {
    await noGithubAtAll();

    await expect(foundOwner(undefined)).resolves.toBeUndefined();
  });

  it('takes the owner the command line named over the one github knows', async () => {
    await githubThat(ANSWERING);

    await expect(foundOwner('a-team')).resolves.toBe('a-team');
  });

  it('takes the owner the command line named when github could not be asked', async () => {
    await noGithubAtAll();

    await expect(foundOwner('a-team')).resolves.toBe('a-team');
  });

  it('asks github when the command line named nobody at all', async () => {
    await githubThat(ANSWERING);

    await expect(foundOwner('   ')).resolves.toBe('reyz');
  });
});
