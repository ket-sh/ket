import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurfaceHandle } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function freshPage(): Promise<string> {
  vi.resetModules();

  const { startSurface } = await import('./server.ts');
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  return (await fetch(handle.address)).text();
}

function styleOf(page: string): string {
  const start = page.indexOf('<style>');

  return page.slice(start, page.indexOf('</style>', start));
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-styles-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the dark scheme the diff styles obey', () => {
  it('scopes the first dark diff rule to the chosen scheme', async () => {
    const style = styleOf(await freshPage());

    expect(style).toContain(":root[data-scheme='dark'] .d2h-auto-color-scheme {");
  });

  it('scopes the last dark diff rule to the chosen scheme', async () => {
    const style = styleOf(await freshPage());

    expect(style).toContain(":root[data-scheme='dark'] .d2h-auto-color-scheme .d2h-moved-tag {");
  });

  it('leaves no dark media query behind', async () => {
    const style = styleOf(await freshPage());

    expect(style).not.toContain('@media (prefers-color-scheme:dark)');
  });

  it('keeps the light diff rules unscoped', async () => {
    const style = styleOf(await freshPage());

    expect(style).toContain('.d2h-wrapper{text-align:left}');
  });

  it('sews the scoped diff styles to the bricks styles cleanly', async () => {
    const style = styleOf(await freshPage());

    expect(style).toContain('var(--d2h-dark-moved-label-color)}\n.grid-stack{position:relative}');
  });

  it('wears the surface skin after the vendor styles', async () => {
    const style = styleOf(await freshPage());

    expect(style).toContain('--color-canvas');
  });
});
