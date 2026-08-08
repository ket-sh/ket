import { describe, expect, it } from 'vitest';

import { openingOf } from './opening.ts';

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

  it('lands the list screen', () => {
    expect(openingOf({ screen: 'list' })).toStrictEqual({ opening: { layout: 'list' } });
  });

  it('lands the map screen', () => {
    expect(openingOf({ screen: 'map' })).toStrictEqual({ opening: { stage: { kind: 'map' } } });
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
      refused: 'bogus names no watch screen. watch opens list or map',
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
