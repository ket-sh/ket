import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { OpeningStage, WatchView } from './opening.ts';

import { isLayout, isTab } from './opening.ts';

function memoryPath(home: string, root: string): string {
  return join(home, `${encodeURIComponent(root)}.json`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function journeyStageOf(held: Record<string, unknown>): OpeningStage | undefined {
  const key = held['key'];
  const tab = held['tab'];

  if (typeof key !== 'string' || typeof tab !== 'string' || !isTab(tab)) {
    return undefined;
  }

  return { kind: 'journey', key, tab };
}

function screenStageOf(kind: unknown): OpeningStage | undefined {
  if (kind === 'map' || kind === 'oplog' || kind === 'docs') {
    return { kind };
  }

  return undefined;
}

function stageOf(declared: unknown): OpeningStage | undefined {
  if (!isRecord(declared)) {
    return undefined;
  }

  const screen = screenStageOf(declared['kind']);

  if (screen !== undefined) {
    return screen;
  }

  return declared['kind'] === 'journey' ? journeyStageOf(declared) : undefined;
}

function layoutHeld(view: WatchView, declared: unknown): WatchView | undefined {
  if (declared === undefined) {
    return view;
  }

  return typeof declared === 'string' && isLayout(declared)
    ? { ...view, layout: declared }
    : undefined;
}

function chosenHeld(view: WatchView, declared: unknown): WatchView | undefined {
  if (declared === undefined) {
    return view;
  }

  return typeof declared === 'string' ? { ...view, chosen: declared } : undefined;
}

function stageHeld(view: WatchView, declared: unknown): WatchView | undefined {
  if (declared === undefined) {
    return view;
  }

  const stage = stageOf(declared);

  return stage === undefined ? undefined : { ...view, stage };
}

function viewShaped(parsed: unknown): WatchView | undefined {
  if (!isRecord(parsed)) {
    return undefined;
  }

  const laid = layoutHeld({}, parsed['layout']);

  if (laid === undefined) {
    return undefined;
  }

  const seated = chosenHeld(laid, parsed['chosen']);

  return seated === undefined ? undefined : stageHeld(seated, parsed['stage']);
}

function parsedOf(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function viewOf(raw: string): WatchView | undefined {
  return viewShaped(parsedOf(raw));
}

export async function readView(home: string, root: string): Promise<WatchView | undefined> {
  const raw = await readFile(memoryPath(home, root), 'utf8').catch(() => undefined);

  return raw === undefined ? undefined : viewOf(raw);
}

// Sync on purpose: the quit path writes this file just before process.exit,
// where a pending async write would be lost.
export function rememberView(home: string, root: string, view: WatchView): void {
  mkdirSync(home, { recursive: true });
  writeFileSync(memoryPath(home, root), JSON.stringify(view));
}
