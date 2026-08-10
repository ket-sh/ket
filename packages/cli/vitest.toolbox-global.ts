import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from 'node:process';

let root = '';

export async function setup(): Promise<void> {
  root = await mkdtemp(join(tmpdir(), 'ket-toolboxes-'));
  env['KET_TOOLBOX_ROOT'] = root;
}

export async function teardown(): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
