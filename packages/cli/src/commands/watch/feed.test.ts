import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { boardFeedFor } from './feed.ts';

const SPEAKS = 3000;

const SILENCE = 400;

const REVEILLE = 100;

interface Tally {
  tell: () => void;
  rose: (patience: number) => Promise<boolean>;
  settles: (quiet: number) => Promise<void>;
  forget: () => void;
}

function tally(): Tally {
  let count = 0;
  let seen = 0;
  let wake: (() => void) | undefined;

  const rose = async (patience: number): Promise<boolean> => {
    if (count > seen) {
      seen = count;

      return true;
    }

    return new Promise<boolean>((settle) => {
      const timer = setTimeout(() => {
        wake = undefined;
        settle(false);
      }, patience);

      wake = () => {
        clearTimeout(timer);
        wake = undefined;
        seen = count;
        settle(true);
      };
    });
  };

  return {
    tell: () => {
      count += 1;
      wake?.();
    },
    rose,
    settles: async (quiet) => {
      let stirring = true;

      while (stirring) {
        stirring = await rose(quiet);
      }
    },
    forget: () => {
      seen = count;
    },
  };
}

let suite = '';
let root = '';
let stop: (() => void) | undefined;

function itemYaml(status: string): string {
  return `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\n`;
}

function eventsAt(home: string): string {
  return join(home, '.ket', 'events.jsonl');
}

function itemAt(home: string): string {
  return join(home, '.ket', 'items', 'K-1', 'item.yaml');
}

// A directory watch is not armed when watch() returns, so the fixture repeats a
// change the watcher must hear either way until the feed answers for one.
async function awake(home: string, told: Tally): Promise<void> {
  const reveille = join(home, '.ket', 'reveille');
  const deadline = Date.now() + SPEAKS;
  let woke = false;

  while (!woke && Date.now() < deadline) {
    await writeFile(reveille, String(Date.now()));
    woke = await told.rose(REVEILLE);
  }

  if (!woke) {
    throw new Error(`the feed under ${home} never woke, so its watcher never armed`);
  }

  await told.settles(REVEILLE * 2);
  told.forget();
}

async function grows(home: string, told: Tally): Promise<boolean> {
  const deadline = Date.now() + SPEAKS;
  let woke = false;

  while (!woke && Date.now() < deadline) {
    await appendFile(eventsAt(home), '{"gate":"turn"}\n');
    woke = await told.rose(REVEILLE);
  }

  return woke;
}

const deafWatcher = (): (() => void) => () => undefined;

beforeAll(async () => {
  suite = await mkdtemp(join(tmpdir(), 'ket-feed-suite-'));
});

afterAll(async () => {
  await rm(suite, { recursive: true, force: true });
});

beforeEach(async () => {
  root = await mkdtemp(join(suite, 'spec-'));
  await mkdir(join(root, '.ket', 'items', 'K-1'), { recursive: true });
  await writeFile(itemAt(root), itemYaml('designing'));
  await writeFile(
    eventsAt(root),
    '{"gate":"transition","outcome":"allowed","about":"designing","item":"K-1","at":"2026-08-07T10:00:00.000Z"}\n',
  );
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('the feed the board drinks from', () => {
  it('folds the store and the log into columns', async () => {
    const columns = await boardFeedFor(root).snapshot();
    const seated = columns.find((column) => column.status === 'designing')?.cards ?? [];

    expect(seated.map((card) => card.key)).toStrictEqual(['K-1']);
    expect(seated[0]?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('tells a subscriber when the log grows', async () => {
    const told = tally();

    stop = boardFeedFor(root, { debounce: 10, poll: 60 }).subscribe(told.tell);

    await awake(root, told);

    await appendFile(
      eventsAt(root),
      '{"gate":"transition","outcome":"allowed","about":"awaiting-approval","item":"K-1"}\n',
    );

    expect(await told.rose(SPEAKS)).toBe(true);
  });

  it('hears a change deep inside the item tree', async () => {
    const told = tally();

    stop = boardFeedFor(root, { debounce: 10, poll: 10_000 }).subscribe(told.tell);

    await awake(root, told);

    await writeFile(itemAt(root), itemYaml('implementing'));

    expect(await told.rose(SPEAKS)).toBe(true);
  });

  it('says nothing more once the subscriber lets go of the item tree', async () => {
    const told = tally();
    const letGo = boardFeedFor(root, { debounce: 10, poll: 10_000 }).subscribe(told.tell);

    stop = letGo;

    await awake(root, told);

    letGo();

    await writeFile(itemAt(root), itemYaml('verifying'));

    expect(await told.rose(SILENCE)).toBe(false);
  });
});

describe('the gate a feed acts through', () => {
  it('moves an eligible item and the next snapshot shows it', async () => {
    await writeFile(join(root, '.ket', 'config.yaml'), 'key: K\ntargets:\n  .: cli\n');
    await writeFile(itemAt(root), itemYaml('awaiting-approval'));

    const feed = boardFeedFor(root);

    await expect(feed.act('K-1', 'approve')).resolves.toStrictEqual({ moved: 'implementing' });

    const columns = await feed.snapshot();
    const seated = columns.find((column) => column.status === 'implementing')?.cards ?? [];

    expect(seated.map((card) => card.key)).toStrictEqual(['K-1']);
  });

  it('returns the refusal and the next snapshot wears it', async () => {
    const feed = boardFeedFor(root);

    await expect(feed.act('K-1', 'ship')).resolves.toStrictEqual({
      refused: 'still designing, so nothing has merged',
    });

    const columns = await feed.snapshot();
    const seated = columns.find((column) => column.status === 'designing')?.cards ?? [];

    expect(seated[0]?.refusal?.reason).toBe('still designing, so nothing has merged');
  });
});

describe('the poll that backstops the watcher', () => {
  it('wakes for growth in a log the poll last saw empty', async () => {
    const told = tally();

    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(told.tell);

    expect(await grows(root, told)).toBe(true);

    await told.settles(REVEILLE);
    told.forget();
    await writeFile(eventsAt(root), '');

    expect(await told.rose(SPEAKS)).toBe(true);

    await told.settles(REVEILLE);
    told.forget();
    await appendFile(eventsAt(root), '{"gate":"turn"}\n');

    expect(await told.rose(SPEAKS)).toBe(true);
  });

  it('hears the log grow through the size poll alone, when the watcher misses', async () => {
    const told = tally();

    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(told.tell);

    expect(await grows(root, told)).toBe(true);
  });

  it('polls without crying wolf: an unchanged log wakes nobody', async () => {
    const told = tally();

    stop = boardFeedFor(root, { debounce: 10, poll: 30 }, deafWatcher).subscribe(told.tell);

    const criedWolf = await told.rose(SILENCE);
    const pollWasAlive = await grows(root, told);

    expect(criedWolf).toBe(false);
    expect(pollWasAlive).toBe(true);
  });

  it('stays quiet after the subscriber lets go', async () => {
    const told = tally();
    const feed = boardFeedFor(root, { debounce: 10, poll: 40 });
    const letGo = feed.subscribe(told.tell);

    stop = letGo;

    letGo();

    await appendFile(eventsAt(root), '{"gate":"turn"}\n');

    expect(await told.rose(SILENCE)).toBe(false);
  });
});
