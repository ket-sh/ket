export interface PanePlace {
  side: 'right' | 'bottom';
  paneWidth: number;
  canvasWidth: number;
}

const QUARTER = 4;

// The canvas is the reason the pane exists beside it, so the pane gives up its
// column the moment the canvas would read as a corridor.
const NARROWEST_CANVAS = 80;

export function panePlaceOf(width: number): PanePlace {
  const paneWidth = Math.round(width / QUARTER);
  const canvasWidth = width - paneWidth;

  if (canvasWidth < NARROWEST_CANVAS) {
    return { side: 'bottom', paneWidth: width, canvasWidth: width };
  }

  return { side: 'right', paneWidth, canvasWidth };
}
