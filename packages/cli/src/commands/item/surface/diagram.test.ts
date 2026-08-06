import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderBlast, renderDiagram } from './diagram.ts';

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
    expect(await renderDiagram(itemDir, 'd2')).toBeUndefined();
  });

  it.skipIf(missingD2)('renders one source into both color schemes', async () => {
    await writeFile(join(itemDir, 'architecture.d2'), 'gate -> surface: shows\n');

    const rendered = await renderDiagram(itemDir, 'd2');

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

  it('hands the source and the theme flags to the renderer', async () => {
    const binary = join(itemDir, 'echo-d2');

    await writeFile(binary, '#!/bin/sh\nprintf "<svg>%s</svg>" "$*"\n');
    await chmod(binary, 0o755);
    await writeFile(join(itemDir, 'architecture.d2'), 'gate -> surface\n');

    const source = join(itemDir, 'architecture.d2');
    const rendered = await renderDiagram(itemDir, binary);

    expect(rendered?.light).toBe(`<svg>${source} -</svg>`);
    expect(rendered?.dark).toBe(`<svg>--theme 200 ${source} -</svg>`);
  });
});

describe('the blast graph the renderer attempts', () => {
  it('draws both themes of the captured graph', async () => {
    const binary = join(itemDir, 'echo-d2');

    await writeFile(binary, '#!/bin/sh\nprintf "<svg>%s</svg>" "$*"\n');
    await chmod(binary, 0o755);
    await writeFile(join(itemDir, 'blast.d2'), 'a -> b\n');

    const source = join(itemDir, 'blast.d2');
    const outcome = await renderBlast(itemDir, binary);

    expect(outcome).toEqual({
      drawn: { light: `<svg>${source} -</svg>`, dark: `<svg>--theme 200 ${source} -</svg>` },
    });
  });

  it('answers the light refusal as the complaint', async () => {
    const binary = join(itemDir, 'dark-only-d2');

    await writeFile(
      binary,
      '#!/bin/sh\ncase "$1" in --theme) printf "<svg>dark</svg>";; *) echo "the light wound" >&2; exit 3;; esac\n',
    );
    await chmod(binary, 0o755);
    await writeFile(join(itemDir, 'blast.d2'), 'a -> b\n');

    const outcome = await renderBlast(itemDir, binary);

    expect(outcome).toHaveProperty('complaint');
    expect(JSON.stringify(outcome)).toContain('the light wound');
  });

  it('answers the dark refusal as the complaint', async () => {
    const binary = join(itemDir, 'light-only-d2');

    await writeFile(
      binary,
      '#!/bin/sh\ncase "$1" in --theme) echo "the dark wound" >&2; exit 3;; *) printf "<svg>light</svg>";; esac\n',
    );
    await chmod(binary, 0o755);
    await writeFile(join(itemDir, 'blast.d2'), 'a -> b\n');

    const outcome = await renderBlast(itemDir, binary);

    expect(JSON.stringify(outcome)).toContain('the dark wound');
    expect(JSON.stringify(outcome)).not.toContain('light</svg>');
  });

  it('names the install when the binary is missing', async () => {
    await writeFile(join(itemDir, 'blast.d2'), 'a -> b\n');

    const outcome = await renderBlast(itemDir, 'ket-no-such-d2');

    expect(JSON.stringify(outcome)).toContain('install d2');
  });
});
