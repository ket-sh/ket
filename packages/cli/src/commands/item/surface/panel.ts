export interface Panel {
  label: string;
  body: string;
  controls: string;
  hook: string;
  width: 'column' | 'full';
  height: 'content' | 'viewport';
  frame: 'fixed' | 'collapsible';
  inset: 'padded' | 'flush';
}

interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GRID_COLUMNS = 12;

const HALF_SPAN = GRID_COLUMNS / 2;

const SEED_ROWS = 24;

const VIEWPORT_ROWS = 76;

const UNWRITTEN = '<p class="unwritten">Not written at this stage.</p>';

export function panelOf(label: string, body: string, extra: Partial<Panel> = {}): Panel {
  return {
    label,
    body,
    controls: '',
    hook: '',
    width: 'column',
    height: 'content',
    frame: 'fixed',
    inset: 'padded',
    ...extra,
  };
}

function nameOf(label: string): string {
  return label
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

function head(panel: Panel): string {
  return `<span class="panel-label">${panel.label}</span><span class="panel-tools">${panel.controls}</span>`;
}

function bodyMarkup(panel: Panel): string {
  const flush = panel.inset === 'flush' ? ' is-flush' : '';
  const filled =
    panel.body === ''
      ? panel.inset === 'flush'
        ? `<div class="unwritten-pad">${UNWRITTEN}</div>`
        : UNWRITTEN
      : panel.body;

  return `<div class="panel-body${flush}">${filled}</div>`;
}

function panelMarkup(panel: Panel): string {
  const shape = `panel is-${panel.width} is-${panel.height}`;
  const classes = panel.hook === '' ? shape : `${shape} ${panel.hook}`;
  const name = nameOf(panel.label);

  return panel.frame === 'collapsible'
    ? `<details class="${classes} panel-collapsible" data-panel="${name}" open><summary class="panel-head">${head(panel)}</summary>${bodyMarkup(panel)}</details>`
    : `<div class="${classes}" data-panel="${name}"><div class="panel-head">${head(panel)}</div>${bodyMarkup(panel)}</div>`;
}

interface RowCursor {
  x: number;
  y: number;
  tallest: number;
}

function wrap(cursor: RowCursor): void {
  cursor.x = 0;
  cursor.y += cursor.tallest;
  cursor.tallest = 0;
}

function advance(cursor: RowCursor, span: number): void {
  if (cursor.x + span >= GRID_COLUMNS) {
    wrap(cursor);
  } else {
    cursor.x += span;
  }
}

function spotsFor(panels: Panel[]): Spot[] {
  const spots: Spot[] = [];
  const cursor: RowCursor = { x: 0, y: 0, tallest: 0 };

  for (const panel of panels) {
    const w = panel.width === 'full' ? GRID_COLUMNS : HALF_SPAN;
    const h = panel.height === 'viewport' ? VIEWPORT_ROWS : SEED_ROWS;

    if (cursor.x + w > GRID_COLUMNS) {
      wrap(cursor);
    }

    spots.push({ x: cursor.x, y: cursor.y, w, h });
    cursor.tallest = Math.max(cursor.tallest, h);
    advance(cursor, w);
  }

  return spots;
}

function brick(panel: Panel, spot: Spot): string {
  return `<div class="grid-stack-item" gs-id="${nameOf(panel.label)}" gs-x="${String(spot.x)}" gs-y="${String(spot.y)}" gs-w="${String(spot.w)}" gs-h="${String(spot.h)}" gs-min-w="${String(HALF_SPAN)}" gs-min-h="4"><div class="grid-stack-item-content">${panelMarkup(panel)}</div></div>`;
}

export function masonry(panels: Panel[]): string {
  const widened: Panel[] =
    panels.length === 1 ? panels.map((entry): Panel => ({ ...entry, width: 'full' })) : panels;
  const spots = spotsFor(widened);
  const bricks = widened.map((panel, order) =>
    brick(panel, spots[order] ?? { x: 0, y: 0, w: GRID_COLUMNS, h: SEED_ROWS }),
  );

  return `<div class="grid-stack">${bricks.join('')}</div>`;
}
