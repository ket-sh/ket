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
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(layoutStore(name)) ?? 'null');

    return Array.isArray(raw) && raw.length > 0 ? raw.filter(isStoredSpot) : undefined;
  } catch {
    return undefined;
  }
}

function spotRecord(raw: unknown): object | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
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
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(narrowStore(name)) ?? '{}');

    return keptSpots(raw);
  } catch {
    return new Map();
  }
}
