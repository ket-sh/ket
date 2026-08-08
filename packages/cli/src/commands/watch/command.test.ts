import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCommand } from '../../run.ts';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-watch-command-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the deep link watch refuses to open', () => {
  it('refuses a key the store never held, in the store’s own words', async () => {
    await expect(runCommand('watch', ['GONE-9', '--cwd', root])).rejects.toThrow(
      'GONE-9 has no item this repository can read',
    );
  });

  it('refuses a tab no journey shows', async () => {
    await expect(runCommand('watch', ['K-1', '--tab', 'bogus', '--cwd', root])).rejects.toThrow(
      'bogus names no journey tab. watch shows overview, workflow, children, artifacts',
    );
  });

  it('refuses a screen watch never shows', async () => {
    await expect(runCommand('watch', ['--screen', 'nowhere', '--cwd', root])).rejects.toThrow(
      'nowhere names no watch screen. watch opens list, map, or oplog',
    );
  });
});
