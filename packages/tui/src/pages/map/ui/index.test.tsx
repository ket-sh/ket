import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { MapReadingView } from '../../../shared/model';

import { MapScreen } from './index.tsx';

const READING: MapReadingView = {
  map: {
    product: {
      name: 'countdown',
      idea: 'a launch checklist that walks a developer through announcing a release',
    },
    spine: [
      {
        activity: 'start the launch',
        steps: [
          { id: 's-playbook', name: 'pick the playbook' },
          { id: 's-draft', name: 'draft the notes' },
        ],
      },
      {
        activity: 'work the steps',
        steps: [
          { id: 's-check', name: 'check off a step' },
          { id: 's-skip', name: 'skip a step' },
        ],
      },
      { activity: 'watch your progress', steps: [{ id: 's-bar', name: 'see the bar' }] },
      {
        activity: 'make the list yours',
        steps: [
          { id: 's-edit', name: 'edit the playbook' },
          { id: 's-add', name: 'add a step' },
        ],
      },
      { activity: 'share your list', steps: [{ id: 's-link', name: 'hand out a link' }] },
    ],
    bands: [
      {
        id: 'r-skeleton',
        name: 'walking skeleton',
        outcome:
          'a developer signs in, runs the built-in launch playbook end to end, and completes a launch',
        cards: [
          { id: 'st-see', name: 'see the built-in playbook', step: 's-playbook', user: 'u-dev' },
          { id: 'st-start', name: 'start a launch from the playbook', step: 's-playbook' },
          { id: 'st-tick', name: 'tick a step done', step: 's-check', user: 'u-dev' },
        ],
      },
      {
        id: 'r-yours',
        name: 'make the list yours',
        outcome: 'a developer tailors the playbook before running it',
        cards: [
          { id: 'st-order', name: 'reorder the steps', step: 's-edit', user: 'u-dev' },
          { id: 'st-add', name: 'add a custom step', step: 's-add' },
        ],
      },
      {
        id: 'r-shared',
        name: 'launch on a shared list',
        outcome: 'two developers work one launch together',
        cards: [{ id: 'st-link', name: 'share a link to your list', step: 's-link' }],
      },
      {
        id: undefined,
        name: 'unassigned',
        outcome: undefined,
        cards: [{ id: 'st-fill', name: 'watch the bar fill', step: 's-bar' }],
      },
    ],
  },
};

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
  rendered = await testRender(<MapScreen reading={READING} onQuit={() => undefined} />, {
    width,
    height,
  });

  return landed((frame) => frame.includes(mark));
}

describe('the map screen in a terminal shorter than the map', () => {
  it('gives the detail line its own cells, free of border strokes', async () => {
    const frame = await openedAt(120, 21, 'u-dev');

    const detailRow = frame.split('\n').find((row) => row.includes('u-dev'));

    expect(detailRow).toContain('see the built-in playbook · u-dev · walking skeleton');
    expect(detailRow).not.toMatch(/[─═╰╯]/);
  });
});
