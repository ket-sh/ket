import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const opened = vi.hoisted(
  (): { calls: { command: string; flags: string[]; options: object }[]; released: number } => ({
    calls: [],
    released: 0,
  }),
);

vi.mock('node:child_process', () => ({
  spawn: (command: string, flags: string[], options: object): { unref: () => void } => {
    opened.calls.push({ command, flags, options });

    return {
      unref: (): void => {
        opened.released += 1;
      },
    };
  },
}));

const { show } = await import('./command.ts');
const { stopSurface } = await import('./server.ts');
const { surfaceItemDir } = await import('./show.ts');

let root = '';
const written: string[] = [];

beforeEach(async () => {
  opened.calls.length = 0;
  opened.released = 0;
  written.length = 0;
  root = await mkdtemp(join(tmpdir(), 'ket-surface-command-'));
  await mkdir(join(root, '.ket', 'items', 'K-1', 'features'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The work\nstatus: triaged\n',
  );
  await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets: {}\n');
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    written.push(String(line));

    return true;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await stopSurface(surfaceItemDir(root, 'K-1'));
  await rm(root, { recursive: true, force: true });
});

function lastAddress(): { address: string; port: number } {
  const parsed: unknown = JSON.parse(written.join('').trim());

  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('the command printed no address');
  }

  return {
    address: String(Reflect.get(parsed, 'address')),
    port: Number(Reflect.get(parsed, 'port')),
  };
}

describe('the shape of the show command', () => {
  it('names itself and its arguments for the cli', () => {
    expect(show.meta).toMatchObject({
      name: 'show',
      description: 'Open the review surface an item is judged on',
    });
    expect(show.args).toMatchObject({
      key: { type: 'positional', required: true, description: 'The item to show' },
      headless: {
        type: 'boolean',
        description: 'Print the address without opening a browser',
      },
    });
  });
});

function onPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

describe('the opener each platform gets', () => {
  it('opens through open on a mac and xdg-open elsewhere', async () => {
    const born = process.platform;

    onPlatform('darwin');
    await show.run?.({ args: { key: 'K-1', headless: false, _: [] }, cmd: show, rawArgs: [] });
    onPlatform('linux');
    await show.run?.({ args: { key: 'K-1', headless: false, _: [] }, cmd: show, rawArgs: [] });
    onPlatform(born);

    expect(opened.calls.map((call) => call.command)).toEqual(['open', 'xdg-open']);
  });
});

describe('the surface the show command raises', () => {
  it('prints the keyed address as one json line and opens nothing when headless', async () => {
    await show.run?.({ args: { key: 'K-1', headless: true, _: [] }, cmd: show, rawArgs: [] });

    const { address, port } = lastAddress();

    expect(address).toContain('http://127.0.0.1:');
    expect(address).toContain('key=');
    expect(port).toBeGreaterThan(0);
    expect(written.join('')).toContain(`{"address":"${address}","port":${port}}\n`);
    expect(opened.calls).toEqual([]);
  });

  it('hands the address to the platform opener otherwise', async () => {
    await show.run?.({ args: { key: 'K-1', headless: false, _: [] }, cmd: show, rawArgs: [] });

    const { address } = lastAddress();

    expect(opened.calls).toEqual([
      {
        command: process.platform === 'darwin' ? 'open' : 'xdg-open',
        flags: [address],
        options: { stdio: 'ignore', detached: true },
      },
    ]);
    expect(opened.released).toBe(1);
  });
});
