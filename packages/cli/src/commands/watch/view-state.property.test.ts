import fc from 'fast-check';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readView, rememberView } from './view-state.ts';

let home = '';
let root = '';

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), 'ket-watch-property-home-'));
  root = await mkdtemp(join(tmpdir(), 'ket-watch-property-root-'));
});

afterAll(async () => {
  await rm(home, { recursive: true, force: true });
  await rm(root, { recursive: true, force: true });
});

const someKey = fc.stringMatching(/^[A-Z]{1,5}-[0-9]{1,4}$/);

const someStage = fc.oneof(
  fc.record({ kind: fc.constant('map' as const) }, { noNullPrototype: true }),
  fc.record(
    {
      kind: fc.constant('journey' as const),
      key: someKey,
      tab: fc.constantFrom(
        'overview' as const,
        'workflow' as const,
        'children' as const,
        'artifacts' as const,
      ),
    },
    { noNullPrototype: true },
  ),
);

const someView = fc.record(
  {
    layout: fc.constantFrom('kanban' as const, 'list' as const, 'backlog' as const),
    chosen: someKey,
    stage: someStage,
  },
  { requiredKeys: [], noNullPrototype: true },
);

async function mangledEveryMemory(bytes: string): Promise<void> {
  const names = await readdir(home);

  await Promise.all(names.map(async (name) => writeFile(join(home, name), bytes)));
}

describe('the memory any watch leaves behind', () => {
  it('round-trips every standing it remembers', async () => {
    await fc.assert(
      fc.asyncProperty(someView, async (view) => {
        rememberView(home, root, view);

        expect(await readView(home, root)).toStrictEqual(view);
      }),
    );
  });

  it('falls back to nothing for any bytes it cannot read, never a throw', async () => {
    await fc.assert(
      fc.asyncProperty(someView, fc.string(), async (view, bytes) => {
        rememberView(home, root, view);
        await mangledEveryMemory(bytes);

        const recalled = await readView(home, root);

        expect(recalled === undefined || typeof recalled === 'object').toBe(true);
      }),
    );
  });
});
