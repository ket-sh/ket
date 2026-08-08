import { describe, expect, it } from 'vitest';

import {
  architectureNodesOf,
  headingAnchors,
  intentPointersOf,
  missingAnchors,
  slugify,
} from './docs-architecture.ts';

const SHARED_ANCHOR = '#packagescli-shared';

const TUI_ANCHOR = '#packagestui-root';

const SHARED_LINK = `skeleton.md${SHARED_ANCHOR}`;

const STORE_LINK = 'skeleton.md#packagescli-store';

const WATCH_LINK = 'skeleton.md#packagescli-commandswatch';

const DOTTED_TUI_LINK = `./skeleton.md${TUI_ANCHOR}`;

const skeleton = [
  '# Architecture skeleton',
  '',
  '## packages/cli',
  '',
  '### packages/cli commands/watch',
  '',
  'Depends on:',
  '',
  `- [packages/cli shared](${SHARED_ANCHOR})`,
  `- [packages/tui root](${TUI_ANCHOR})`,
  '',
  '### packages/cli shared',
  '',
  'Depends on nothing inside the workspace.',
  '',
  '## packages/tui',
  '',
  '### packages/tui root',
  '',
  'Depends on nothing inside the workspace.',
  '',
].join('\n');

describe('heading anchors', () => {
  it('given headings with slashes and spaces, then anchors slug the GitHub way', () => {
    const anchors = headingAnchors('## packages/cli\n\n### packages/cli commands/create\n');

    expect(anchors).toEqual(['packagescli', 'packagescli-commandscreate']);
  });

  it('given a heading, then its slug lowers the case and keeps the dashes', () => {
    expect(slugify('Commands are islands')).toBe('commands-are-islands');
  });

  it('given hash marks mid-line, then no anchor and no node appears', () => {
    expect(headingAnchors('prose about ## marks\n')).toEqual([]);
    expect(architectureNodesOf('prose about ### marks\n')).toEqual([]);
  });
});

describe('intent anchors', () => {
  it('given intent pointing at a living skeleton node, then nothing is missing', () => {
    const intent = `The floor of the cli is [shared](${SHARED_LINK}).`;

    expect(missingAnchors(intent, skeleton)).toEqual([]);
  });

  it('given intent pointing at a node that no longer exists, then the node is named', () => {
    const intent = `The old [store](${STORE_LINK}) held state.`;

    expect(missingAnchors(intent, skeleton)).toEqual(['packagescli-store']);
  });

  it('given links that leave the skeleton alone, then the gate has nothing to say', () => {
    const intent =
      'See the [handbook](../handbook.md#the-pipeline) and [Vale](https://vale.sh/#install).';

    expect(missingAnchors(intent, skeleton)).toEqual([]);
  });

  it('given the same dead anchor twice, then it is named once', () => {
    const dead = '[store](skeleton.md#packagescli-store)';

    expect(missingAnchors(`${dead} and ${dead}`, skeleton)).toEqual(['packagescli-store']);
  });
});

describe('the nodes the skeleton draws', () => {
  it('given component headings, then each becomes a node wearing its anchor', () => {
    const nodes = architectureNodesOf(skeleton);

    expect(nodes.map((node) => node.label)).toEqual([
      'packages/cli commands/watch',
      'packages/cli shared',
      'packages/tui root',
    ]);
    expect(nodes[0]?.anchor).toBe('packagescli-commandswatch');
  });

  it('given a component with dependency links, then its edges name the targets', () => {
    const watch = architectureNodesOf(skeleton).find(
      (node) => node.label === 'packages/cli commands/watch',
    );

    expect(watch?.edges).toEqual(['packages/cli shared', 'packages/tui root']);
  });

  it('given a component depending on nothing inside the workspace, then it has no edges', () => {
    const shared = architectureNodesOf(skeleton).find(
      (node) => node.label === 'packages/cli shared',
    );

    expect(shared?.edges).toEqual([]);
  });

  it('given a link wearing a trailer or riding mid-sentence, then no edge draws', () => {
    const askew = '### a b\n- [c d](#c-d) trailing\nsee - [e f](#e-f)\n';

    expect(architectureNodesOf(askew)[0]?.edges).toEqual([]);
  });
});

describe('the intent pointers at a node', () => {
  const intent = [
    '# Architecture intent',
    '',
    '## Commands are islands',
    '',
    `Whatever two commands both need lives in [shared](${SHARED_LINK}).`,
    '',
    '## The cli draws no terminal',
    '',
    `Only [watch](${WATCH_LINK}) reaches`,
    `[the tui](${DOTTED_TUI_LINK}), and [shared](${SHARED_LINK})`,
    'never draws.',
    '',
  ].join('\n');

  it('given a section linking a node, then the pointer carries the section title', () => {
    expect(intentPointersOf(intent)).toContainEqual({
      anchor: 'packagescli-commandswatch',
      section: 'The cli draws no terminal',
    });
  });

  it('given two sections linking one node, then each section points once', () => {
    const pointers = intentPointersOf(intent).filter(
      (pointer) => pointer.anchor === 'packagescli-shared',
    );

    expect(pointers.map((pointer) => pointer.section)).toEqual([
      'Commands are islands',
      'The cli draws no terminal',
    ]);
  });

  it('given links that leave the skeleton alone, then no pointer appears', () => {
    expect(intentPointersOf('See the [handbook](../handbook.md#the-pipeline).')).toEqual([]);
  });

  it('given a link above any heading, then the pointer stands on intent', () => {
    expect(intentPointersOf('[shared](skeleton.md#packagescli-shared)')).toEqual([
      { anchor: 'packagescli-shared', section: 'intent' },
    ]);
  });
});
