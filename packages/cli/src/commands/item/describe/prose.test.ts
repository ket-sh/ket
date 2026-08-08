import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { proseFrom } from './prose.ts';

const RATIONALE = 'Slice rationale\n\nThe form comes first, the lockout notice second.\n';

let held = '';

beforeEach(async () => {
  held = await mkdtemp(join(tmpdir(), 'ket-prose-'));
});

afterEach(async () => {
  await rm(held, { recursive: true, force: true });
});

function piped(said: string): Readable {
  return Readable.from([said]);
}

describe('where the prose a description takes comes from', () => {
  it('takes what the flag carries, over anything waiting on the pipe', async () => {
    await expect(
      proseFrom({ description: RATIONALE, file: undefined }, piped('the pipe said otherwise')),
    ).resolves.toStrictEqual({ prose: RATIONALE });
  });

  it('reads the file the flag names, since a shell mangles long prose', async () => {
    const path = join(held, 'rationale.md');

    await writeFile(path, RATIONALE, 'utf8');

    await expect(
      proseFrom({ description: undefined, file: path }, piped('')),
    ).resolves.toStrictEqual({ prose: RATIONALE });
  });

  it('reads what was piped in when neither flag arrives', async () => {
    await expect(
      proseFrom({ description: undefined, file: undefined }, piped(RATIONALE)),
    ).resolves.toStrictEqual({ prose: RATIONALE });
  });

  it('refuses both flags at once, since nothing says which one wins', async () => {
    await expect(
      proseFrom({ description: RATIONALE, file: join(held, 'rationale.md') }, piped('')),
    ).resolves.toStrictEqual({
      refused: '--description and --file both say where the prose comes from',
    });
  });

  it('refuses a file it cannot read, naming the path it was given', async () => {
    const missing = join(held, 'never-written.md');

    await expect(
      proseFrom({ description: undefined, file: missing }, piped('')),
    ).resolves.toStrictEqual({ refused: `${missing} is not a file this repository can read` });
  });
});
