import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderDiagram } from './diagram.ts';

const missingD2 = spawnSync('d2', ['--version']).error !== undefined;

let itemDir = '';

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-diagram-'));
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

describe('the diagram an architecture source renders into', () => {
  it('answers no diagram for an item without a source', async () => {
    expect(await renderDiagram(itemDir)).toBeUndefined();
  });

  it.skipIf(missingD2)('renders one source into both color schemes', async () => {
    await writeFile(join(itemDir, 'architecture.d2'), 'gate -> surface: shows\n');

    const rendered = await renderDiagram(itemDir);

    expect(rendered?.light).toContain('<svg');
    expect(rendered?.dark).toContain('<svg');
    expect(rendered?.dark).not.toBe(rendered?.light);
  });

  it('refuses a present source when the binary is missing, naming the install', async () => {
    await writeFile(join(itemDir, 'architecture.d2'), 'gate -> surface\n');

    await expect(renderDiagram(itemDir, 'ket-no-such-d2')).rejects.toThrow(/install d2/);
  });
});
