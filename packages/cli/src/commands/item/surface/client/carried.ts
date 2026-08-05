interface SurfaceCarried {
  live: string;
  itemKey: string;
  selected: string;
  routes: Record<string, { section: string; feature: string }>;
  firstChild: Record<string, string>;
}

export interface Bricklayer {
  el: Element;
  on(name: string, run: (event: Event, brick: Element) => void): void;
  update(
    brick: Element,
    spot: {
      x?: number | undefined;
      y?: number | undefined;
      w?: number | undefined;
      h?: number | undefined;
      sizeToContent?: number | boolean | undefined;
    },
  ): void;
  load(layout: object[], addAndRemove: boolean): void;
  save(content: boolean, full: boolean): object[];
  onResize(): void;
}

declare global {
  var ketSurfaceTheme: {
    chosen(): string | undefined;
    choose(wanted: string): void;
  };

  interface Window {
    ketSurface: SurfaceCarried;
    GridStack?: { GridStack?: BricksEngine } & BricksEngine;
  }
}

export interface StoredSpot {
  x?: number;
  w?: number;
  h?: number;
}

interface BricksEngine {
  init(options: object, host: Element): Bricklayer;
}

export const ketSurface = window.ketSurface;
