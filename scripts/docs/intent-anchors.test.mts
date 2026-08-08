import { describe, expect, it } from 'vitest';

import { missingAnchors } from './intent-anchors.mts';

const skeleton = '## packages/cli\n\n### packages/cli shared\n';

const livingLink = '[shared](skeleton.md#packagescli-shared)';

const deadLink = '[store](skeleton.md#packagescli-store)';

const deadAnchor = 'packagescli-store';

describe('intent anchors', () => {
  it('given intent pointing at a living skeleton node, then nothing is missing', () => {
    const intent = `The floor of the cli is ${livingLink}.`;

    expect(missingAnchors(intent, skeleton)).toEqual([]);
  });

  it('given intent pointing at a node that no longer exists, then the node is named', () => {
    const intent = `The old ${deadLink} held state.`;

    expect(missingAnchors(intent, skeleton)).toEqual([deadAnchor]);
  });

  it('given links that leave the skeleton alone, then the gate has nothing to say', () => {
    const intent =
      'See the [handbook](../handbook.md#the-pipeline) and [Vale](https://vale.sh/#install).';

    expect(missingAnchors(intent, skeleton)).toEqual([]);
  });

  it('given the same dead anchor twice, then it is named once', () => {
    const intent = `${deadLink} and ${deadLink}`;

    expect(missingAnchors(intent, skeleton)).toEqual([deadAnchor]);
  });
});
