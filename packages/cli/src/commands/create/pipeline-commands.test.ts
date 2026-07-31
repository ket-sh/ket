import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PIPELINE_COMMANDS } from './pipeline-commands.generated.ts';

const MARKER = join('harness', 'commands');

// The mutation runner copies this package into a sandbox, so the number of
// steps up to the repository is not fixed. The harness is the marker.
function harnessFrom(start: string): string {
  let walking = start;

  while (!existsSync(join(walking, MARKER))) {
    const above = dirname(walking);

    if (above === walking) {
      throw new Error(`no ${MARKER} above ${start}, so the harness cannot be read`);
    }

    walking = above;
  }

  return join(walking, MARKER);
}

const COMMANDS = harnessFrom(import.meta.dirname);

const MARKDOWN = '.md';

async function commandsTheHarnessShips(): Promise<{ name: string; says: string; at: number }[]> {
  const entries = await readdir(COMMANDS);
  const named = entries.filter((entry) => entry.endsWith(MARKDOWN)).toSorted();

  return Promise.all(
    named.map(async (entry) => {
      const contents = await readFile(join(COMMANDS, entry), 'utf8');
      const lines = contents.split('\n');
      const said = lines.find((each) => each.startsWith('description:')) ?? '';
      const ordered = lines.find((each) => each.startsWith('order:')) ?? '';

      return {
        name: entry.slice(0, -MARKDOWN.length),
        says: said.slice('description:'.length).trim(),
        at: Number(ordered.slice('order:'.length).trim()),
      };
    }),
  );
}

describe('the commands a created project is told about', () => {
  it('names every command the harness ships, and none it does not', async () => {
    const shipped = await commandsTheHarnessShips();

    expect(PIPELINE_COMMANDS.map((command) => command.name).toSorted()).toStrictEqual(
      shipped.map((command) => command.name).toSorted(),
    );
  });

  it('lists them in the order each one declares, not the order a directory returns', async () => {
    const shipped = await commandsTheHarnessShips();
    const wanted = shipped.toSorted((left, right) => left.at - right.at);

    expect(PIPELINE_COMMANDS.map((command) => command.name)).toStrictEqual(
      wanted.map((command) => command.name),
    );
  });

  it('gives every command an order, since a missing one would sort as nothing', async () => {
    for (const command of await commandsTheHarnessShips()) {
      expect({ name: command.name, ordered: Number.isInteger(command.at) }).toStrictEqual({
        name: command.name,
        ordered: true,
      });
    }
  });

  it('gives no two commands the same place in the list', async () => {
    const places = (await commandsTheHarnessShips()).map((command) => command.at);

    expect(new Set(places).size).toBe(places.length);
  });

  it('opens with the command a person reaches for first', () => {
    expect(PIPELINE_COMMANDS[0]?.name).toBe('feature');
  });

  it('gives every one of them a description, so the outro says what each is for', () => {
    for (const command of PIPELINE_COMMANDS) {
      expect({ name: command.name, says: command.says === '' }).toStrictEqual({
        name: command.name,
        says: false,
      });
    }
  });
});

describe('what the outro can lay out', () => {
  it('keeps every description inside the width the table can hold', () => {
    for (const command of PIPELINE_COMMANDS) {
      expect({ name: command.name, short: command.says.length <= 58 }).toStrictEqual({
        name: command.name,
        short: true,
      });
    }
  });
});
