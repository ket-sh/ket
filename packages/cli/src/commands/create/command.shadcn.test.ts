import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { teach } from '../../../vitest.toolbox-setup.ts';
import { runCommand } from '../../run.ts';

const A_CODE = 'b2D0vQ7G4';

const RECORDING_BUN = `#!/bin/sh
echo "bun $*" >> tool.log
exit 0
`;

const RECORDING_BUNX = `#!/bin/sh
echo "bunx $*" >> tool.log
exit 0
`;

const APPLY_REFUSING_BUNX = `#!/bin/sh
case "$1" in
  shadcn*) echo "could not reach the registry"; exit 1;;
esac
echo "bunx $*" >> tool.log
exit 0
`;

let sandbox = '';

async function toolsThat(bunx: string): Promise<void> {
  await teach('bun', RECORDING_BUN);
  await teach('bunx', bunx);
}

async function readIfWritten(root: string, path: string): Promise<string | undefined> {
  return readFile(join(root, path), 'utf8').catch(() => undefined);
}

beforeEach(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'ket-create-shadcn-'));
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('creating a web project with a shadcn preset code', () => {
  it('lands the code through the pinned official CLI in the new project', async () => {
    await toolsThat(RECORDING_BUNX);

    const where = join(sandbox, 'storefront');

    await runCommand('create', [where, '--preset', 'web', '--shadcn', A_CODE]);

    expect(await readIfWritten(where, 'tool.log')).toContain(
      `bunx shadcn@4.16.2 apply --preset ${A_CODE} --yes`,
    );
  });

  it('installs the toolchain before the apply, so the CLI installs with bun', async () => {
    await toolsThat(RECORDING_BUNX);

    const where = join(sandbox, 'storefront');

    await runCommand('create', [where, '--preset', 'web', '--shadcn', A_CODE]);

    const ran = (await readIfWritten(where, 'tool.log')) ?? '';

    expect(ran.indexOf('bun install')).toBeGreaterThanOrEqual(0);
    expect(ran.indexOf('bun install')).toBeLessThan(ran.indexOf('apply --preset'));
  });

  it('keeps the scaffold when the apply refuses, so the default still stands', async () => {
    await toolsThat(APPLY_REFUSING_BUNX);

    const where = join(sandbox, 'storefront');

    await runCommand('create', [where, '--preset', 'web', '--shadcn', A_CODE]);

    expect(await readIfWritten(where, '.ket/config.yaml')).toContain('web');
  });
});

describe('creating a web project without a shadcn preset code', () => {
  it('writes stock shadcn and never runs the official CLI', async () => {
    await toolsThat(RECORDING_BUNX);

    const where = join(sandbox, 'plain');

    await runCommand('create', [where, '--preset', 'web']);

    expect((await readIfWritten(where, 'tool.log')) ?? '').not.toContain('shadcn@');
  });
});

describe('refusing a shadcn preset code the scaffold cannot honor', () => {
  it('refuses a malformed code before writing anything', async () => {
    await toolsThat(RECORDING_BUNX);

    const where = join(sandbox, 'misspelled');

    await expect(
      runCommand('create', [where, '--preset', 'web', '--shadcn', 'b_23']),
    ).rejects.toThrow('is not a shadcn preset code');
    expect(await readIfWritten(where, '.ket/config.yaml')).toBeUndefined();
  });

  it('refuses a code aimed at a preset that ships no shadcn', async () => {
    await toolsThat(RECORDING_BUNX);

    const where = join(sandbox, 'terminal');

    await expect(
      runCommand('create', [where, '--preset', 'cli', '--shadcn', A_CODE]),
    ).rejects.toThrow('ships no shadcn');
  });
});
