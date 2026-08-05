import type { Bricklayer, StoredSpot } from './carried.ts';

import { stillPress, swallowNextClick, wirePress } from './press.ts';
import {
  fitted,
  halfSpan,
  layoutStore,
  legalLayout,
  legalSpan,
  narrowStore,
  storedLayout,
  storedNarrow,
} from './spots.ts';

const gridCell = 8;
const grids = new Map<Element, Bricklayer>();

interface SpanState {
  grid: Bricklayer;
  name: string;
  narrowed: Map<string, StoredSpot>;
}

const gridOptions = {
  column: 12,
  cellHeight: gridCell,
  margin: 8,
  float: false,
  minRow: 1,
  animate: true,
  sizeToContent: false,
  handle: '.panel-head',
  draggable: { cancel: '.panel-tools' },
  resizable: { handles: 'n,ne,e,se,s,sw,w,nw', autoHide: false },
};

function capRows(host: Element): number {
  return Math.max(12, Math.floor((host.parentElement?.clientHeight ?? 0) / gridCell));
}

function shapeBricks(grid: Bricklayer): void {
  const cap = capRows(grid.el);

  for (const brick of grid.el.querySelectorAll<HTMLElement>('.grid-stack-item')) {
    const panel = brick.querySelector<HTMLElement>('.panel');

    if (panel === null) {
      continue;
    }

    grid.update(
      brick,
      panel.classList.contains('is-viewport')
        ? { h: cap, sizeToContent: false }
        : { h: undefined, sizeToContent: cap },
    );
  }

  grid.onResize();
}

function paintSpans(grid: Bricklayer): void {
  for (const brick of grid.el.querySelectorAll<HTMLElement>('.grid-stack-item')) {
    const panel = brick.querySelector<HTMLElement>('.panel');

    if (panel === null) {
      continue;
    }

    const spread = Number(brick.getAttribute('gs-w')) === 12;

    panel.classList.toggle('is-full', spread);
    panel.classList.toggle('is-column', !spread);
  }
}

function spanOf(brick: Element): number {
  return Number(brick.getAttribute('gs-w'));
}

function widen(state: SpanState, brick: Element, id: string): StoredSpot {
  state.narrowed.set(id, fitted(brick.getAttribute('gs-x'), spanOf(brick)));

  return { x: 0, w: 12 };
}

function shrink(state: SpanState, id: string): StoredSpot {
  const kept = state.narrowed.get(id);

  state.narrowed.delete(id);

  return kept ?? { x: 0, w: halfSpan };
}

function toggleSpan(state: SpanState, brick: Element): void {
  const id = brick.getAttribute('gs-id') ?? '';
  const wanted = spanOf(brick) === 12 ? shrink(state, id) : widen(state, brick, id);

  localStorage.setItem(narrowStore(state.name), JSON.stringify(Object.fromEntries(state.narrowed)));
  state.grid.update(brick, wanted);
  paintSpans(state.grid);
  state.grid.onResize();
}

function headTarget(target: Element): Element | undefined {
  const head = target.closest('.panel-head');

  return head === null || target.closest('.panel-tools') !== null ? undefined : head;
}

function pressedHead(event: Event): Element | undefined {
  if (!(event.target instanceof Element) || !(event instanceof PointerEvent)) {
    return undefined;
  }

  return stillPress(event) ? headTarget(event.target) : undefined;
}

function foldLater(folder: HTMLDetailsElement): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    folder.open = !folder.open;
    settleGrid();
  }, 220);
}

function wireFolding(state: SpanState): void {
  let pendingFold: ReturnType<typeof setTimeout> | undefined;

  state.grid.el.addEventListener('click', (event) => {
    const head = pressedHead(event);
    const folder = head?.tagName === 'SUMMARY' ? head.closest('details') : null;

    if (folder === null) {
      return;
    }

    event.preventDefault();
    clearTimeout(pendingFold);
    pendingFold = foldLater(folder);
  });

  state.grid.el.addEventListener('dblclick', (event) => {
    const head = pressedHead(event);
    const brick = head?.closest('.grid-stack-item') ?? null;

    if (brick === null) {
      return;
    }

    clearTimeout(pendingFold);
    event.preventDefault();
    toggleSpan(state, brick);
  });
}

function wireResizing(state: SpanState): void {
  let grabbedX: number | undefined;

  state.grid.on('resizestart', (_started, brick) => {
    grabbedX = Number(brick.getAttribute('gs-x'));
  });

  state.grid.on('resizestop', (_stopped, brick) => {
    const held = Number(brick.getAttribute('gs-x'));
    const span = spanOf(brick);
    const legal = legalSpan(span);
    const anchored = held === grabbedX ? held : held + span - legal;
    const spot = fitted(anchored, legal);

    if (spot.w !== span || spot.x !== held) {
      state.grid.update(brick, spot);
    }

    paintSpans(state.grid);
    state.grid.onResize();
  });

  state.grid.on('dragstop', () => {
    swallowNextClick();
  });
}

function wireSaving(state: SpanState): void {
  state.grid.on('change added removed', () => {
    paintSpans(state.grid);
    localStorage.setItem(layoutStore(state.name), JSON.stringify(state.grid.save(false, false)));
  });
}

function loadLayout(state: SpanState): void {
  const saved = storedLayout(state.name);

  if (saved === undefined) {
    shapeBricks(state.grid);
  } else {
    state.grid.load(legalLayout(saved), false);
  }

  paintSpans(state.grid);
}

function nameOf(section: Element): string {
  return section instanceof HTMLElement ? (section.dataset['section'] ?? '') : '';
}

function buildGrid(section: Element, host: HTMLElement): Bricklayer | undefined {
  const carrier = window.GridStack;

  if (carrier === undefined) {
    return undefined;
  }

  const engine = carrier.GridStack ?? carrier;
  const grid = engine.init(gridOptions, host);
  const name = nameOf(section);
  const state: SpanState = { grid, name, narrowed: storedNarrow(name) };

  grids.set(host, grid);
  wireFolding(state);
  wireResizing(state);
  loadLayout(state);
  wireSaving(state);

  return grid;
}

function gridFor(section: Element): Bricklayer | undefined {
  const host = section.querySelector<HTMLElement>('.grid-stack');

  if (host === null) {
    return undefined;
  }

  return grids.get(host) ?? buildGrid(section, host);
}

export function settleGrid(): void {
  const active = document.querySelector<HTMLElement>('.section.is-active');

  if (active === null) {
    return;
  }

  const grid = gridFor(active);

  if (grid !== undefined) {
    grid.onResize();
  }
}

export function wireBricks(): void {
  wirePress();
  document.addEventListener('ket-surface-shown', settleGrid);
  addEventListener('resize', settleGrid);
  settleGrid();
}
