import { describe, expect, it } from 'vitest';

import { openedFrom, openingOf } from './opening.ts';

describe('the opening a watch invocation asks for', () => {
  it('opens the board when nothing is asked', () => {
    expect(openingOf({})).toStrictEqual({ opening: undefined });
  });

  it('opens the asked item on its overview tab', () => {
    expect(openingOf({ key: 'K-1' })).toStrictEqual({
      opening: { stage: { kind: 'journey', key: 'K-1', tab: 'overview' } },
    });
  });

  it('lands the asked tab of the asked item', () => {
    expect(openingOf({ key: 'K-1', tab: 'children' })).toStrictEqual({
      opening: { stage: { kind: 'journey', key: 'K-1', tab: 'children' } },
    });
  });

  it('refuses a tab no journey shows, naming the ones it does', () => {
    const reading = openingOf({ key: 'K-1', tab: 'bogus' });

    expect(reading).toStrictEqual({
      refused: 'bogus names no journey tab. watch shows overview, workflow, children, artifacts',
    });
  });

  it('refuses a screen watch never shows, naming the ones it does', () => {
    const reading = openingOf({ screen: 'bogus' });

    expect(reading).toStrictEqual({
      refused: 'bogus names no watch screen. watch opens list, map, oplog, or docs',
    });
  });

  it('refuses a tab that names no item to open', () => {
    expect(openingOf({ tab: 'children' })).toStrictEqual({
      refused: '--tab needs an item key to open a journey',
    });
  });

  it('refuses a key and a screen asked together', () => {
    expect(openingOf({ key: 'K-1', screen: 'map' })).toStrictEqual({
      refused: 'K-1 and --screen map ask for two openings. name one',
    });
  });
});

describe('the screens a deep link lands', () => {
  it('lands the list screen', () => {
    expect(openingOf({ screen: 'list' })).toStrictEqual({ opening: { layout: 'list' } });
  });

  it('lands the map screen', () => {
    expect(openingOf({ screen: 'map' })).toStrictEqual({ opening: { stage: { kind: 'map' } } });
  });

  it('lands the oplog screen', () => {
    expect(openingOf({ screen: 'oplog' })).toStrictEqual({
      opening: { stage: { kind: 'oplog' } },
    });
  });

  it('lands the docs screen', () => {
    expect(openingOf({ screen: 'docs' })).toStrictEqual({
      opening: { stage: { kind: 'docs' } },
    });
  });
});

describe('what opens when a deep link meets a memory', () => {
  it('lets the deep link beat the memory', () => {
    expect(openedFrom({ stage: { kind: 'map' } }, { layout: 'list' })).toStrictEqual({
      stage: { kind: 'map' },
    });
  });

  it('lets the memory stand when nothing is asked', () => {
    expect(openedFrom(undefined, { layout: 'list' })).toStrictEqual({ layout: 'list' });
  });

  it('opens the board when neither speaks', () => {
    expect(openedFrom(undefined, undefined)).toBeUndefined();
  });
});
