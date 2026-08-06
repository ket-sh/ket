import { beforeEach, describe, expect, it } from 'vitest';

Reflect.set(window, 'ketSurface', {
  live: '/ws?key=k',
  itemKey: 'K-7',
  selected: 'design',
  routes: {},
  firstChild: {},
});

const { layoutStore, narrowStore, storedLayout, storedNarrow } = await import('./spots.ts');

beforeEach(() => {
  localStorage.clear();
});

describe('the store names a layout keeps per item and section', () => {
  it('scopes both stores by item key and section name', () => {
    expect(layoutStore('design')).toBe('ket-surface-layout:K-7:design');
    expect(narrowStore('design')).toBe('ket-surface-narrow:K-7:design');
  });
});

describe('the layout a section remembers', () => {
  it('hands back the stored spots', () => {
    localStorage.setItem(layoutStore('design'), JSON.stringify([{ x: 0, w: 6 }]));

    expect(storedLayout('design')).toEqual([{ x: 0, w: 6 }]);
  });

  it('treats nothing stored as no layout', () => {
    expect(storedLayout('design')).toBeUndefined();
  });

  it('treats an empty list as no layout', () => {
    localStorage.setItem(layoutStore('design'), '[]');

    expect(storedLayout('design')).toBeUndefined();
  });

  it('treats broken json as no layout', () => {
    localStorage.setItem(layoutStore('design'), '{oops');

    expect(storedLayout('design')).toBeUndefined();
  });

  it('drops entries that are not spots', () => {
    localStorage.setItem(layoutStore('design'), JSON.stringify([{ x: 6, w: 6 }, null, 4]));

    expect(storedLayout('design')).toEqual([{ x: 6, w: 6 }]);
  });
});

describe('the narrow spots a section remembers per brick', () => {
  it('hands back the kept shapes by brick id', () => {
    localStorage.setItem(narrowStore('design'), JSON.stringify({ brief: { x: 6, w: 6 } }));

    expect(storedNarrow('design')).toEqual(new Map([['brief', { x: 6, w: 6 }]]));
  });

  it('treats nothing stored as an empty keep', () => {
    expect(storedNarrow('design')).toEqual(new Map());
  });

  it('treats broken json as an empty keep', () => {
    localStorage.setItem(narrowStore('design'), 'not json');

    expect(storedNarrow('design')).toEqual(new Map());
  });

  it('treats a stored list as an empty keep', () => {
    localStorage.setItem(narrowStore('design'), JSON.stringify([{ x: 0, w: 6 }]));

    expect(storedNarrow('design')).toEqual(new Map());
  });

  it('drops shapes that are not spots', () => {
    localStorage.setItem(
      narrowStore('design'),
      JSON.stringify({ brief: { x: 0, w: 6 }, broken: 4 }),
    );

    expect(storedNarrow('design')).toEqual(new Map([['brief', { x: 0, w: 6 }]]));
  });
});
