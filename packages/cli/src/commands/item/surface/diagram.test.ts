import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

  it('surfaces a render refusal naming the binary, the source, and the reason', async () => {
    const binary = join(itemDir, 'refusing-d2');
    const source = join(itemDir, 'architecture.d2');

    await writeFile(source, 'gate -> surface\n');
    await writeFile(binary, '#!/bin/sh\necho "the diagram wound" >&2\nexit 3\n');
    await chmod(binary, 0o755);

    const rendering = renderDiagram(itemDir, binary);

    await expect(rendering).rejects.toThrow(`${binary} refused ${source}`);
    await expect(rendering).rejects.toThrow('the diagram wound');
  });

  it('delivers an oversized rendered diagram whole', async () => {
    const binary = join(itemDir, 'wide-d2');
    const wide = `<svg>${'k'.repeat(2 * 1024 * 1024)}</svg>`;

    await writeFile(join(itemDir, 'architecture.d2'), 'gate -> surface\n');
    await writeFile(join(itemDir, 'wide.svg'), wide);
    await writeFile(binary, `#!/bin/sh\ncat "${join(itemDir, 'wide.svg')}"\n`);
    await chmod(binary, 0o755);

    const rendered = await renderDiagram(itemDir, binary);

    expect(rendered?.light).toBe(wide);
  });
});
