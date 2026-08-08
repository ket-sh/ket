import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { adrTitlesUnder, envelopeFrom, readAdvised } from './context.ts';

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-adr-'));
}

async function ketDirectory(): Promise<string> {
  const root = await scratch();

  await mkdir(join(root, '.ket'), { recursive: true });

  return root;
}

describe('the record of what ket has already advised a project on', () => {
  it('reads back the sections an earlier run wrote', async () => {
    const root = await ketDirectory();

    await writeFile(
      join(root, '.ket', 'toolchain.yaml'),
      'dependencies:\n  - drizzle-orm\ndecisions:\n  - A choice\nkinds: []\n',
      'utf8',
    );

    expect(await readAdvised(root)).toStrictEqual({
      dependencies: ['drizzle-orm'],
      decisions: ['A choice'],
      kinds: [],
    });
  });

  it('holds every section empty for a project ket has never advised, so each name arrives once', async () => {
    expect(await readAdvised(await ketDirectory())).toStrictEqual({
      dependencies: [],
      decisions: [],
      kinds: [],
    });
  });

  it('holds every section empty for a record that is not yaml, rather than throwing on it', async () => {
    const root = await ketDirectory();

    await writeFile(join(root, '.ket', 'toolchain.yaml'), 'dependencies: [oops\n', 'utf8');

    expect(await readAdvised(root)).toStrictEqual({
      dependencies: [],
      decisions: [],
      kinds: [],
    });
  });
});

async function recordsAdr(root: string, at: string, body: string): Promise<void> {
  const path = join(root, at);

  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, body, 'utf8');
}

describe('reading the envelope a hook piped in', () => {
  it('parses the object the runtime sent', () => {
    expect(envelopeFrom('{"hook_event_name":"PostToolUse"}')).toStrictEqual({
      hook_event_name: 'PostToolUse',
    });
  });

  it('reads nothing from an empty stdin, since a session start pipes none', () => {
    expect(envelopeFrom('')).toBeUndefined();
  });

  it('reads nothing from a payload that is not json, rather than throwing on it', () => {
    expect(envelopeFrom('{ not json')).toBeUndefined();
  });
});

describe('reading the decisions a project has recorded', () => {
  it('reads a heading from an ADR beside an item', async () => {
    const root = await scratch();

    await recordsAdr(
      root,
      '.ket/items/OS-1/adr.md',
      '# Use Postgres over MySQL\n\nStatus: accepted\n',
    );

    expect(await adrTitlesUnder(root)).toStrictEqual(['Use Postgres over MySQL']);
  });

  it('reads a heading from an ADR under docs, so a project without the workflow is read', async () => {
    const root = await scratch();

    await recordsAdr(root, 'docs/adr/0001-choose-postgres.md', '# Choose Postgres\n');

    expect(await adrTitlesUnder(root)).toStrictEqual(['Choose Postgres']);
  });

  it('reads nothing from a project that recorded no decision', async () => {
    expect(await adrTitlesUnder(await scratch())).toStrictEqual([]);
  });

  it('leaves out a record that carries no heading', async () => {
    const root = await scratch();

    await recordsAdr(root, '.ket/items/OS-1/adr.md', 'a note with no heading\n');

    expect(await adrTitlesUnder(root)).toStrictEqual([]);
  });
});
