import { describe, expect, it } from 'vitest';

const openedSockets: { address: string; onmessage: ((event: { data: string }) => void) | null }[] =
  [];

class SocketStub {
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(address: string) {
    openedSockets.push(this);
    this.address = address;
  }

  address: string;
}

Reflect.set(window, 'ketSurface', {
  live: '/ws?key=the-key',
  itemKey: 'K-7',
  selected: 'design',
  routes: {},
  firstChild: {},
});
Reflect.set(globalThis, 'WebSocket', SocketStub);
Reflect.set(window, 'WebSocket', SocketStub);

document.body.innerHTML =
  '<section class="section is-active" id="section-design" data-section="design"></section>';

await import('./main.ts');

describe('the live channel the page opens', () => {
  it('dials the carried address on the page host', () => {
    expect(openedSockets).toHaveLength(1);
    expect(openedSockets[0]?.address).toBe(`ws://${location.host}/ws?key=the-key`);
  });

  it('reloads the page when the surface announces a change', () => {
    let reloads = 0;

    Reflect.set(location, 'reload', () => {
      reloads += 1;
    });
    openedSockets[0]?.onmessage?.({ data: 'changed' });

    expect(reloads).toBe(1);
  });
});
