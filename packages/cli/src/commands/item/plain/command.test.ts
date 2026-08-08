import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { drift, stamp } from './command.ts';
import { fingerprintOf } from './state.ts';

let root = '';
let itemDir = '';
let lines: string[] = [];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-plain-'));
  itemDir = join(root, '.ket', 'items', 'K-1');
  await mkdir(itemDir, { recursive: true });
  await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets: {}\n');
  await writeFile(join(itemDir, 'item.yaml'), 'title: The plain item\nstatus: designing\n');
  lines = [];
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.spyOn(process.stdout, 'write').mockImplementation((line: string | Uint8Array): boolean => {
    lines.push(String(line));

    return true;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  await rm(root, { recursive: true, force: true });
});

async function runDrift(): Promise<void> {
  await drift.run?.({ args: { key: 'K-1', _: [] }, cmd: drift, rawArgs: [] });
}

async function runStamp(): Promise<void> {
  await stamp.run?.({ args: { key: 'K-1', _: [] }, cmd: stamp, rawArgs: [] });
}

describe('the drift the command reads', () => {
  it('describes itself and takes the item key', () => {
    expect(drift.meta).toMatchObject({
      name: 'drift',
      description: 'Read whether each plain sibling still matches its source',
    });
    expect(drift.args).toMatchObject({ key: { type: 'positional', required: true } });
  });

  it('stays quiet and green for an item without plain siblings', async () => {
    await writeFile(join(itemDir, 'spec.md'), 'the spec\n');

    await runDrift();

    expect(lines).toEqual([]);
    expect(process.exitCode).toBeUndefined();
  });

  it('names each sibling with its state and fails on a stale one', async () => {
    const spec = 'the spec\n';

    await writeFile(join(itemDir, 'spec.md'), spec);
    await writeFile(join(itemDir, 'spec.plain.md'), `Source: ${fingerprintOf(spec)}\n\n# Plain\n`);
    await writeFile(join(itemDir, 'solution-design.md'), 'the design\n');
    await writeFile(join(itemDir, 'solution-design.plain.md'), 'Source: 000000000000\n\n# Old\n');

    await runDrift();

    expect(lines).toEqual(['spec.plain.md fresh\n', 'solution-design.plain.md stale\n']);
    expect(process.exitCode).toBe(1);
  });

  it('fails on an unstamped sibling and on an orphaned one', async () => {
    await writeFile(join(itemDir, 'spec.md'), 'the spec\n');
    await writeFile(join(itemDir, 'spec.plain.md'), '# Plain, never stamped\n');
    await writeFile(join(itemDir, 'adr.plain.md'), 'Source: 000000000000\n\n# Orphan\n');

    await runDrift();

    expect(lines).toEqual(['spec.plain.md unstamped\n', 'adr.plain.md orphaned\n']);
    expect(process.exitCode).toBe(1);
  });

  it('stays green when every sibling is fresh', async () => {
    const spec = 'the spec\n';
    const adr = 'the record\n';

    await writeFile(join(itemDir, 'spec.md'), spec);
    await writeFile(join(itemDir, 'spec.plain.md'), `Source: ${fingerprintOf(spec)}\n\n# P\n`);
    await writeFile(join(itemDir, 'adr.md'), adr);
    await writeFile(join(itemDir, 'adr.plain.md'), `Source: ${fingerprintOf(adr)}\n\n# R\n`);

    await runDrift();

    expect(lines).toEqual(['spec.plain.md fresh\n', 'adr.plain.md fresh\n']);
    expect(process.exitCode).toBeUndefined();
  });

  it('refuses a key this repository cannot read', async () => {
    await expect(
      drift.run?.({ args: { key: 'K-9', _: [] }, cmd: drift, rawArgs: [] }),
    ).rejects.toThrow('K-9 has no item this repository can read');
  });
});

describe('the tree the item command carries', () => {
  it('offers drift and stamp beside the stages', async () => {
    const item = (await import('../command.ts')).default;

    expect(item.subCommands).toMatchObject({ drift, stamp });
  });
});

describe('the stamps the command writes', () => {
  it('describes itself and takes the item key', () => {
    expect(stamp.meta).toMatchObject({
      name: 'stamp',
      description: 'Stamp each plain sibling with the fingerprint of its source',
    });
    expect(stamp.args).toMatchObject({ key: { type: 'positional', required: true } });
  });

  it('stamps every sibling into freshness and says so', async () => {
    const spec = 'the spec\n';
    const design = 'the design\n';

    await writeFile(join(itemDir, 'spec.md'), spec);
    await writeFile(join(itemDir, 'spec.plain.md'), '# Plain spec\n');
    await writeFile(join(itemDir, 'solution-design.md'), design);
    await writeFile(join(itemDir, 'solution-design.plain.md'), 'Source: 000000000000\n\n# Old\n');

    await runStamp();

    expect(lines).toEqual(['spec.plain.md stamped\n', 'solution-design.plain.md stamped\n']);
    expect(process.exitCode).toBeUndefined();
    expect(await readFile(join(itemDir, 'spec.plain.md'), 'utf8')).toBe(
      `Source: ${fingerprintOf(spec)}\n\n# Plain spec\n`,
    );
    expect(await readFile(join(itemDir, 'solution-design.plain.md'), 'utf8')).toBe(
      `Source: ${fingerprintOf(design)}\n\n# Old\n`,
    );
  });

  it('leaves an orphaned sibling unwritten and fails naming it', async () => {
    await writeFile(join(itemDir, 'adr.plain.md'), '# Orphan\n');

    await runStamp();

    expect(lines).toEqual(['adr.plain.md orphaned\n']);
    expect(process.exitCode).toBe(1);
    expect(await readFile(join(itemDir, 'adr.plain.md'), 'utf8')).toBe('# Orphan\n');
  });

  it('writes nothing for an item without plain siblings', async () => {
    await writeFile(join(itemDir, 'spec.md'), 'the spec\n');

    await runStamp();

    expect(lines).toEqual([]);
    expect(process.exitCode).toBeUndefined();
  });
});
