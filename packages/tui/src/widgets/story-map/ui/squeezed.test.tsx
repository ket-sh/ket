import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { ThemeProvider } from '../../../shared/theme';
import { MapPane } from './index.tsx';
import { crowdedMap, LONG_GOAL } from './map-fixtures.ts';

const WELDED_INTO_A_BORDER = /[A-Za-z][─═]|[─═][A-Za-z]/;

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function settled(): Promise<string> {
  await rendered?.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered?.renderOnce();

  return rendered?.captureCharFrame() ?? '';
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 2_000) {
    frame = await settled();
  }

  return frame;
}

async function openedAt(width: number, height: number, mark: string): Promise<string> {
  rendered = await testRender(
    <ThemeProvider>
      <MapPane reading={{ map: crowdedMap() }} at={0} frame={{ cols: width, rows: height }} />
    </ThemeProvider>,
    { width, height },
  );

  return landed((frame) => frame.includes(mark));
}

function rowsOf(frame: string): string[] {
  return frame.split('\n');
}

describe('a map taller than the terminal that shows it', () => {
  it('carries the first band goal whole across its title row', async () => {
    const frame = await openedAt(120, 26, 'walking');

    expect(frame).toContain(`walking skeleton · ${LONG_GOAL}`);
  });

  it('keeps the product name and its idea on rows of their own', async () => {
    const frame = await openedAt(120, 28, 'checklist');

    const nameRows = rowsOf(frame).filter((row) => row.trim() === 'countdown');

    expect(nameRows).toHaveLength(1);
    expect(frame).toContain(
      'a launch checklist that walks a developer through announcing a release',
    );
  });

  it('gives the detail line its own cells, free of border strokes', async () => {
    const frame = await openedAt(120, 19, 'u-dev');

    const detailRow = rowsOf(frame).find((row) => row.includes('u-dev'));

    expect(detailRow).toContain('see the built-in playbook · u-dev · walking skeleton');
    expect(detailRow).not.toMatch(WELDED_INTO_A_BORDER);
  });

  it('never welds a word into a border stroke anywhere on the page', async () => {
    const frame = await openedAt(120, 28, 'walking');

    expect(frame).not.toMatch(WELDED_INTO_A_BORDER);
  });
});

function bandBottomsIn(rows: string[]): number[] {
  return rows.flatMap((row, at) => {
    const stroke = row.trim();
    const closesABand = stroke.startsWith('╰') && stroke.endsWith('╯') && stroke.length > 100;

    return closesABand ? [at] : [];
  });
}

describe('the room a band gives its cards', () => {
  it('holds every card and a margin row above each closing border', async () => {
    const frame = await openedAt(200, 50, 'unassigned');
    const rows = rowsOf(frame);
    const bottoms = bandBottomsIn(rows);

    expect(bottoms).toHaveLength(4);

    for (const bottom of bottoms) {
      expect(rows[bottom - 1]?.trim()).toMatch(/^│\s+│$/);
    }
  });
});
