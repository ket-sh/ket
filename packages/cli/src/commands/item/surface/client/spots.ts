import type { StoredSpot } from './carried.ts';

import { ketSurface } from './carried.ts';

function isStoredSpot(shape: unknown): shape is StoredSpot {
  return shape !== null && typeof shape === 'object';
}

export function layoutStore(name: string): string {
  return 'ket-surface-layout:' + ketSurface.itemKey + ':' + name;
}

export function narrowStore(name: string): string {
  return 'ket-surface-narrow:' + ketSurface.itemKey + ':' + name;
}

export function storedLayout(name: string): StoredSpot[] | undefined {
  const held = localStorage.getItem(layoutStore(name));

  if (held === null) {
    return undefined;
  }

  try {
    const raw: unknown = JSON.parse(held);

    return Array.isArray(raw) && raw.length > 0 ? raw.filter(isStoredSpot) : undefined;
  } catch {
    return undefined;
  }
}

function spotRecord(raw: unknown): object | undefined {
  if (raw === null || Array.isArray(raw)) {
    return undefined;
  }

  return raw;
}

function keptSpots(raw: unknown): Map<string, StoredSpot> {
  const kept = new Map<string, StoredSpot>();
  const record = spotRecord(raw);

  if (record === undefined) {
    return kept;
  }

  for (const [spot, shape] of Object.entries(record)) {
    if (isStoredSpot(shape)) {
      kept.set(spot, shape);
    }
  }

  return kept;
}

export function storedNarrow(name: string): Map<string, StoredSpot> {
  const held = localStorage.getItem(narrowStore(name));

  if (held === null) {
    return new Map();
  }

  try {
    const raw: unknown = JSON.parse(held);

    return keptSpots(raw);
  } catch {
    return new Map();
  }
}
