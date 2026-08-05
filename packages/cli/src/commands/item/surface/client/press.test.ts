import { beforeEach, describe, expect, it, vi } from 'vitest';

import { stillPress, swallowNextClick, wirePress } from './press.ts';

function pressAt(x: number, y: number): void {
  window.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y }));
}

function clickThrough(): boolean {
  let reached = false;
  const witness = (): void => {
    reached = true;
  };

  document.body.addEventListener('click', witness);
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  document.body.removeEventListener('click', witness);

  return reached;
}

beforeEach(() => {
  wirePress();
});

describe('the press the bricks measure', () => {
  it('counts a release within three pixels as a still press', () => {
    pressAt(10, 10);

    expect(stillPress(new MouseEvent('click', { clientX: 12, clientY: 11 }))).toBe(true);
  });

  it('counts a farther release as a drag, not a press', () => {
    pressAt(10, 10);

    expect(stillPress(new MouseEvent('click', { clientX: 14, clientY: 10 }))).toBe(false);
  });

  it('treats a page with no press yet as still', async () => {
    vi.resetModules();

    const fresh = await import('./press.ts');

    expect(fresh.stillPress(new MouseEvent('click', { clientX: 500, clientY: 500 }))).toBe(true);
  });
});

describe('the click a finished drag swallows', () => {
  it('swallows nothing on a freshly loaded page', async () => {
    vi.resetModules();

    const fresh = await import('./press.ts');

    fresh.wirePress();

    expect(clickThrough()).toBe(true);
  });

  it('stops exactly one click after a drag asks for it', () => {
    swallowNextClick();

    expect(clickThrough()).toBe(false);
    expect(clickThrough()).toBe(true);
  });

  it('forgets the swallow once a new press lands', () => {
    swallowNextClick();
    pressAt(1, 1);

    expect(clickThrough()).toBe(true);
  });

  it('measures the press before anything downstream can stop it', () => {
    const muzzle = (event: Event): void => {
      event.stopPropagation();
    };

    document.body.addEventListener('pointerdown', muzzle);
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 7, clientY: 7 }),
    );
    document.body.removeEventListener('pointerdown', muzzle);

    expect(stillPress(new MouseEvent('click', { clientX: 8, clientY: 8 }))).toBe(true);
    expect(stillPress(new MouseEvent('click', { clientX: 300, clientY: 300 }))).toBe(false);
  });
});
