import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ShadcnPresetApplied } from './shadcn.ts';

import { applyShadcnPreset } from './shadcn-apply.ts';

const A_CODE = 'b2D0vQ7G4';

const RECORDING_BUN = `#!/bin/sh
echo "bun $*" >> tool.log
exit 0
`;

const RECORDING_BUNX = `#!/bin/sh
echo "bunx $*" >> tool.log
exit 0
`;

const REFUSING_BUNX = `#!/bin/sh
echo "could not reach the registry"
exit 1
`;

const REFUSING_BUN = `#!/bin/sh
echo "a dependency did not resolve"
exit 1
`;

const PATH_SEPARATOR = ':';

let restored = '';

async function toolsThat(bun: string, bunx: string): Promise<void> {
  const where = await mkdtemp(join(tmpdir(), 'ket-shadcn-tools-'));

  await writeFile(join(where, 'bun'), bun, 'utf8');
  await chmod(join(where, 'bun'), 0o755);
  await writeFile(join(where, 'bunx'), bunx, 'utf8');
  await chmod(join(where, 'bunx'), 0o755);

  process.env['PATH'] = `${where}${PATH_SEPARATOR}${restored}`;
}

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-shadcn-project-'));
}

async function ranIn(root: string): Promise<string> {
  return readFile(join(root, 'tool.log'), 'utf8').catch(() => '');
}

function refusalIn(outcome: ShadcnPresetApplied): string {
  return 'refused' in outcome ? outcome.refused : '';
}

beforeEach(() => {
  restored = process.env['PATH'] ?? '';
});

afterEach(() => {
  process.env['PATH'] = restored;
});

describe('landing a shadcn preset in a written scaffold', () => {
  it('answers absent and runs nothing when nobody gave a code', async () => {
    await toolsThat(RECORDING_BUN, RECORDING_BUNX);

    const root = await project();

    expect(await applyShadcnPreset(root, undefined)).toStrictEqual({ absent: true });
    expect(await ranIn(root)).toBe('');
  });

  it('installs the toolchain, then applies through the official CLI, inside the project', async () => {
    await toolsThat(RECORDING_BUN, RECORDING_BUNX);

    const root = await project();

    expect(await applyShadcnPreset(root, A_CODE)).toStrictEqual({ applied: A_CODE });
    expect(await ranIn(root)).toBe(
      `bun install\nbunx shadcn@4.16.2 apply --preset ${A_CODE} --yes\n`,
    );
  });

  it('quotes the tool and names the recovery command when the apply refuses', async () => {
    await toolsThat(RECORDING_BUN, REFUSING_BUNX);

    const refusal = refusalIn(await applyShadcnPreset(await project(), A_CODE));

    expect(refusal).toContain(`${A_CODE} did not apply: could not reach the registry`);
    expect(refusal).toContain(
      `Apply it in the project later with: bun install && bunx shadcn@4.16.2 apply --preset ${A_CODE} --yes`,
    );
  });

  it('stops at a toolchain that did not install, never reaching the CLI', async () => {
    await toolsThat(REFUSING_BUN, RECORDING_BUNX);

    const root = await project();
    const refusal = refusalIn(await applyShadcnPreset(root, A_CODE));

    expect(refusal).toContain('a dependency did not resolve');
    expect(await ranIn(root)).toBe('');
  });
});
