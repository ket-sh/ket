import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { ThemeProvider } from '../../../shared/theme';
import { MapPane } from './index.tsx';
import { crowdedMap } from './map-fixtures.ts';

const CARD_UNDER_HEADER: [string, string][] = [
  ['pick the playbook', 'see the built-in'],
  ['check off a step', 'tick a step done'],
  ['see the bar', 'watch the bar fill'],
  ['edit the playbook', 'reorder the steps'],
  ['add a step', 'add a custom step'],
  ['hand out a link', 'share a link to'],
];

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

async function openedAt(width: number, height: number): Promise<string> {
  rendered = await testRender(
    <ThemeProvider>
      <MapPane reading={{ map: crowdedMap() }} at={0} frame={{ cols: width, rows: height }} />
    </ThemeProvider>,
    { width, height },
  );

  return landed((frame) => frame.includes('pick the playbook'));
}

function columnOf(rows: string[], text: string): number {
  const row = rows.find((candidate) => candidate.includes(text));

  return row?.indexOf(text) ?? -1;
}

function misalignedIn(frame: string): string[] {
  const rows = frame.split('\n');

  return CARD_UNDER_HEADER.flatMap(([header, card]) => {
    const headerColumn = columnOf(rows, header);
    const cardColumn = columnOf(rows, card);

    return cardColumn === headerColumn + 1
      ? []
      : [`${card} at ${String(cardColumn)} strays from ${header} at ${String(headerColumn)}`];
  });
}

describe('the columns the backbone hangs its cards on', () => {
  it('seats every card exactly under the step that owns it, wide open', async () => {
    const frame = await openedAt(200, 50);

    expect(misalignedIn(frame)).toEqual([]);
  });

  it('keeps the seating exact when the width divides unevenly', async () => {
    const frame = await openedAt(209, 50);

    expect(misalignedIn(frame)).toEqual([]);
  });
});
