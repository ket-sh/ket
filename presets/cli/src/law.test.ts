import { SLICE_PLACEHOLDER, testFileFor } from '@ket/preset';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

const UNIT = 'greeting';

const RUNS = 'bun run';

async function standingLaw(): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', 'CLAUDE.md'), 'utf8');
}

describe('the standing law the cli preset writes into a project', () => {
  it('names the directory a slice roots in, so the layout it teaches is the one it writes', async () => {
    const law = await standingLaw();

    for (const root of CLI_SEMANTICS.slice.roots) {
      const [rooted] = root.split(SLICE_PLACEHOLDER);

      expect(law).toContain(rooted);
    }
  });

  it('names the adapter a slice keeps its process behavior in', async () => {
    const [adapter] = CLI_SEMANTICS.slice.adapters;

    expect(await standingLaw()).toContain(adapter);
  });

  it('names both test files a unit takes, since one of them is easy to forget', async () => {
    const law = await standingLaw();

    expect(law).toContain(testFileFor(CLI_SEMANTICS.tests.example, UNIT));
    expect(law).toContain(testFileFor(CLI_SEMANTICS.tests.property, UNIT));
  });

  it('sends the reader to the manifest for the gate chain rather than listing it', async () => {
    const law = await standingLaw();
    const listed = Object.keys(CLI_SEMANTICS.scripts).filter((script) =>
      law.includes(`${RUNS} ${script}`),
    );

    expect(listed).toStrictEqual([]);
  });
});
