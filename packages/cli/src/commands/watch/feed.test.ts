import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boardFeedFor } from './feed.ts';

let root = '';
let stop: (() => void) | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-feed-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(
    join(root, '.ket', 'items', 'K-1', 'item.yaml'),
    'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  );
  await writeFile(
    join(root, '.ket', 'events.jsonl'),
    '{"gate":"transition","outcome":"allowed","about":"designing","item":"K-1","at":"2026-08-07T10:00:00.000Z"}\n',
  );
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  await rm(root, { recursive: true, force: true });
});

async function settled(checked: () => boolean, patience: number): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < patience) {
    if (checked()) {
      return true;
    }

    await new Promise((tick) => {
      setTimeout(tick, 20);
    });
  }

  return checked();
}

describe('the feed the board drinks from', () => {
  it('folds the store and the log into columns', async () => {
    const columns = await boardFeedFor(root).snapshot();
    const seated = columns.find((column) => column.status === 'designing')?.cards ?? [];

    expect(seated.map((card) => card.key)).toStrictEqual(['K-1']);
    expect(seated[0]?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('tells a subscriber when the log grows', async () => {
    let told = 0;

    stop = boardFeedFor(root, { debounce: 10, poll: 60 }).subscribe(() => {
      told += 1;
    });

    await appendFile(
      join(root, '.ket', 'events.jsonl'),
      '{"gate":"transition","outcome":"allowed","about":"awaiting-approval","item":"K-1"}\n',
    );

    expect(await settled(() => told > 0, 2000)).toBe(true);
  });

  it('hears a change deep inside the item tree, then nothing once let go', async () => {
    let told = 0;
    const letGo = boardFeedFor(root, { debounce: 10, poll: 10_000 }).subscribe(() => {
      told += 1;
    });

    await writeFile(
      join(root, '.ket', 'items', 'K-1', 'item.yaml'),
      'title: The watched item\nkind: feature\nsize: story\nstatus: implementing\n',
    );

    const heardTheChange = await settled(() => told > 0, 2000);

    letGo();

    const heard = told;

    await writeFile(
      join(root, '.ket', 'items', 'K-1', 'item.yaml'),
      'title: The watched item\nkind: feature\nsize: story\nstatus: verifying\n',
    );

    expect(heardTheChange).toBe(true);
    expect(await settled(() => told > heard, 300)).toBe(false);
  });
});

describe('the poll that backstops the watcher', () => {
  it('wakes for growth in a log that began empty', async () => {
    let told = 0;
    const deafWatcher = () => () => undefined;

    await writeFile(join(root, '.ket', 'events.jsonl'), '');
    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(() => {
      told += 1;
    });

    await new Promise((tick) => {
      setTimeout(tick, 80);
    });
    await appendFile(join(root, '.ket', 'events.jsonl'), '{"gate":"turn"}\n');

    expect(await settled(() => told > 0, 2000)).toBe(true);
  });

  it('hears the log grow through the size poll alone, when the watcher misses', async () => {
    let told = 0;
    const deafWatcher = () => () => undefined;

    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(() => {
      told += 1;
    });

    await new Promise((tick) => {
      setTimeout(tick, 80);
    });
    await appendFile(join(root, '.ket', 'events.jsonl'), '{"gate":"turn"}\n');

    expect(await settled(() => told > 0, 2000)).toBe(true);
  });

  it('polls without crying wolf: an unchanged log wakes nobody', async () => {
    let told = 0;
    const deafWatcher = () => () => undefined;

    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(() => {
      told += 1;
    });

    expect(await settled(() => told > 0, 300)).toBe(false);
  });

  it('stays quiet after the subscriber lets go', async () => {
    let told = 0;
    const feed = boardFeedFor(root, { debounce: 10, poll: 40 });
    const letGo = feed.subscribe(() => {
      told += 1;
    });

    letGo();

    await appendFile(join(root, '.ket', 'events.jsonl'), '{"gate":"turn"}\n');

    const heard = told;

    expect(await settled(() => told > heard, 300)).toBe(false);
  });
});
