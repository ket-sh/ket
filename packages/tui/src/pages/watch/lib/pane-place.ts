import { NODE_H } from './layout.ts';

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

export interface PaneFit {
  canvasHeight: number;
  paneLines: number;
}

const WHOLE_STAGE_FRAME = NODE_H + 2;

const PANE_BORDERS = 2;

export function paneFitOf(height: number, lineCount: number): PaneFit {
  const roomy = height - lineCount - PANE_BORDERS;

  if (roomy >= WHOLE_STAGE_FRAME) {
    return { canvasHeight: roomy, paneLines: lineCount };
  }

  const paneLines = Math.max(0, Math.min(lineCount, height - WHOLE_STAGE_FRAME - PANE_BORDERS));

  return {
    canvasHeight: Math.max(WHOLE_STAGE_FRAME, height - paneLines - PANE_BORDERS),
    paneLines,
  };
}
