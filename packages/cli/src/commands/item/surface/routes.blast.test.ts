import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurfaceHandle } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function pageThrough(binary: string): Promise<string> {
  vi.resetModules();

  const { startSurface } = await import('./server.ts');
  const handle = await startSurface(itemDir, { d2Binary: binary });

  open.push(handle);

  return (await fetch(handle.address)).text();
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-blast-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The blasted item\nstatus: verifying\n');
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the blast the served page carries', () => {
  it('renders the captured graph through the named renderer into the blast section', async () => {
    const binary = join(itemDir, 'echo-d2');

    await writeFile(binary, '#!/bin/sh\nprintf "<svg>the captured graph</svg>"\n');
    await chmod(binary, 0o755);
    await writeFile(join(itemDir, 'blast.d2'), 'a: { class: module }\na -> b\n');
    await writeFile(join(itemDir, 'blast.json'), '{"budget":20,"uncollapsedNodes":1}');

    const page = await pageThrough(binary);

    expect(page).toContain('data-panel="blast-radius"');
    expect(page).toContain('1 affected modules, 1 edges');
    expect(page).toContain('<svg>the captured graph</svg>');
  });

  it('admits nothing was measured when no graph was captured', async () => {
    const page = await pageThrough('ket-no-such-d2');
    const start = page.indexOf('id="section-blast"');
    const section = page.slice(start, page.indexOf('</section>', start));

    expect(start).toBeGreaterThan(-1);
    expect(section).toContain('Not written at this stage.');
  });
});
