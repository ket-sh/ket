import '../../../../../vitest.client-setup.ts';
import { describe, expect, it } from 'vitest';

import type { Bricklayer } from './carried.ts';

export interface EngineSeen {
  options: Record<string, unknown>;
  inits: number;
  resizes: number;
  saves: { content: boolean; full: boolean }[];
  loads: { count: number; addAndRemove: boolean }[];
}

export interface FakeBrickEngine {
  init(options: object, host: Element): Bricklayer;
  seen: EngineSeen;
  fire(name: string, brick: Element): void;
}

type Handler = (event: Event, brick: Element) => void;

function applySpot(brick: Element, spot: object): void {
  for (const [field, value] of Object.entries(spot)) {
    if (value !== undefined) {
      brick.setAttribute(
        `gs-${field.replaceAll(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`)}`,
        String(value),
      );
    }
  }
}

function numberAt(brick: Element, field: string): number {
  return Number(brick.getAttribute(field)) || 0;
}

function spotRead(brick: Element): object {
  return {
    id: brick.getAttribute('gs-id') ?? '',
    x: numberAt(brick, 'gs-x'),
    y: numberAt(brick, 'gs-y'),
    w: numberAt(brick, 'gs-w'),
    h: numberAt(brick, 'gs-h'),
  };
}

function idOf(entry: object): string {
  return Object.entries(entry)
    .filter(([field]) => field === 'id')
    .map((pair) => String(pair[1]))
    .join('');
}

function brickById(host: Element, id: string): Element | undefined {
  return [...host.querySelectorAll('.grid-stack-item')].find(
    (brick) => brick.getAttribute('gs-id') === id,
  );
}

export function fakeBricks(): FakeBrickEngine {
  const seen: EngineSeen = { options: {}, inits: 0, resizes: 0, saves: [], loads: [] };
  const handlers = new Map<string, Handler[]>();
  const answer = (name: string, brick: Element): void => {
    for (const handler of handlers.get(name) ?? []) {
      handler(new Event(name), brick);
    }
  };

  return {
    seen,
    fire: answer,
    init(options: object, host: Element): Bricklayer {
      seen.options = { ...options };
      seen.inits += 1;

      return {
        el: host,
        on(names: string, run: Handler): void {
          for (const name of names.split(' ')) {
            handlers.set(name, [...(handlers.get(name) ?? []), run]);
          }
        },
        update(brick, spot): void {
          applySpot(brick, spot);
          answer('change', brick);
        },
        load(layout: object[], addAndRemove: boolean): void {
          seen.loads.push({ count: layout.length, addAndRemove });

          for (const entry of layout) {
            const found = brickById(host, idOf(entry));

            if (found !== undefined) {
              applySpot(found, entry);
            }
          }
        },
        save: (content: boolean, full: boolean): object[] => {
          seen.saves.push({ content, full });

          return [...host.querySelectorAll('.grid-stack-item')].map(spotRead);
        },
        onResize(): void {
          seen.resizes += 1;
        },
      };
    },
  };
}

describe('the fake engine the brick specs drive', () => {
  it('applies updates to gs attributes and announces the change', () => {
    document.body.innerHTML = `<div class="grid-stack"><div class="grid-stack-item" gs-id="one" gs-x="0" gs-w="6"><div class="panel"></div></div></div>`;

    const engine = fakeBricks();
    const host = document.querySelector('.grid-stack');
    const brick = document.querySelector('.grid-stack-item');

    if (host === null || brick === null) {
      throw new Error('missing dom');
    }

    const grid = engine.init({ column: 12 }, host);
    let changes = 0;

    grid.on('change added removed', () => {
      changes += 1;
    });
    grid.update(brick, { x: 6, w: 6, sizeToContent: 24 });

    expect(brick.getAttribute('gs-x')).toBe('6');
    expect(brick.getAttribute('gs-size-to-content')).toBe('24');
    expect(changes).toBe(1);
    expect(grid.save(false, false)).toEqual([{ id: 'one', x: 6, y: 0, w: 6, h: 0 }]);
  });
});
